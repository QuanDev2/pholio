import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { prisma } from "../lib/prisma";
import { assertOwnsPost } from "../lib/postOwnership";
import { Prisma } from "../generated/prisma/client";
import { serializePost, postInclude } from "../lib/serializers";
import { assertTagsExist } from "../lib/tags";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { validate } from "../middleware/validate";
import { createPostSchema, updatePostSchema } from "../schemas/posts";
import { authenticate } from "../middleware/authenticate";
import { randomUUID } from "crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { uploadUrlSchema, registerPhotoSchema, updatePhotoSchema } from "../schemas/photo";
import z from "zod";

// Mounted at /posts in app.ts — paths here are RELATIVE to that prefix.
const router = Router();

// --- Post reads (public) ---

// GET /posts → the /explore world feed (published posts of all users)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const where = { published: true };
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: where,
        orderBy: { createdAt: "desc" },
        include: postInclude,
      }),
      prisma.post.count({ where: where }),
    ]);

    return res.json({ data: posts.map(serializePost), total, page, limit });
  }),
);

// GET /posts/mine → caller's own posts incl. drafts.
// MUST be registered before '/:slug', else 'mine' matches the :slug param.
router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req, res) => {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user!.id },
      include: postInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      data: posts.map(serializePost),
    });
  }),
);

// GET /posts/mine/:id → one of the caller's own posts by id (drafts included).
// The editor loads by id; this is owner-scoped so you can never open someone
// else's post. Separate from the public GET /:slug to sidestep the id-vs-slug
// route collision (both are one-segment /posts/X). findFirst with the compound
// where returns null for a nonexistent OR non-owned post → 404 (hides existence).
router.get(
  "/mine/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, authorId: req.user!.id },
      include: postInclude,
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ data: serializePost(post) });
  }),
);

// GET /posts/:slug → single post with photos + tags + author
router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const post = await prisma.post.findUnique({
      where: { slug: slug },
      include: postInclude,
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ data: serializePost(post) });
  }),
);

// --- Post writes ---

router.post(
  "/",
  authenticate,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const { title, tags } = req.body;

    const base = slugify(title, { lower: true, strict: true });
    const slug = `${base}-${nanoid(6)}`;

    await assertTagsExist(tags);

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: { type: "doc", content: [] },
        published: false,
        author: { connect: { id: req.user!.id } },
        tags: {
          connect: tags.map((id: string) => ({ id })),
        },
      },
      include: postInclude,
    });

    res.status(201).json({ data: serializePost(post) });
  }),
);

router.patch(
  "/:id",
  authenticate,
  validate(updatePostSchema),
  asyncHandler(async (req, res) => {
    // authorization
    const id = req.params.id;
    await assertOwnsPost(id, req.user!.id);

    const { title, content, published } = req.body;
    const tags = req.body.tags;
    if (tags !== undefined) {
      await assertTagsExist(tags);
    }

    let post;
    const tagUpdate = tags !== undefined ? { set: tags.map((id: string) => ({ id })) } : undefined;
    try {
      post = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          published,
          tags: tagUpdate,
        },
        include: postInclude,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return res.status(404).json({ error: "Post not found" });
      }
      throw err;
    }

    res.status(200).json({ data: serializePost(post) });
  }),
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    await assertOwnsPost(req.params.id, req.user!.id);
    await prisma.post.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  }),
);

// --- Nested photo writes (real S3-backed logic in Week 5) ---
// A photo is always addressed through its parent post: Photo.postId is required.

// POST /posts/:id/photos → register an already-uploaded S3 object as a Photo
// row (called after the client PUTs the file to the presigned URL). The bytes
// are already in S3; this is what tells the DB they exist.
router.post(
  "/:id/photos",
  authenticate,
  validate(registerPhotoSchema),
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    await assertOwnsPost(postId, req.user!.id);

    const { key, caption } = req.body as z.infer<typeof registerPhotoSchema>;

    // Trust boundary: the client hands back a key, but could send any string.
    // Our upload-url endpoint only ever signs keys under photos/{postId}/, so
    // reject anything outside this post's prefix — a user can't claim an
    // arbitrary S3 object (or one belonging to another post).
    if (!key.startsWith(`photos/${postId}/`)) {
      return res.status(400).json({ error: "Key does not belong to this post" });
    }

    const photo = await prisma.photo.create({
      data: {
        postId,
        key,
        caption,
        status: "pending",
      },
    });

    res.status(201).json({ data: photo });
  }),
);

// PATCH /posts/:id/photos/:photoId → edit a photo (caption only). Ownership is
// via the parent post; the photo is additionally scoped to that post so you
// can't reach another post's photo through a post you happen to own.
router.patch(
  "/:id/photos/:photoId",
  authenticate,
  validate(updatePhotoSchema),
  asyncHandler(async (req, res) => {
    const { id: postId, photoId } = req.params;
    await assertOwnsPost(postId, req.user!.id);

    const { caption } = req.body as z.infer<typeof updatePhotoSchema>;

    // updateMany lets us filter by BOTH id and postId (a single `update` can
    // only match on the unique id). count === 0 → the photo doesn't exist or
    // isn't on this post; either way it's a 404 to the caller.
    const { count } = await prisma.photo.updateMany({
      where: { id: photoId, postId },
      data: { caption },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    res.json({ data: photo });
  }),
);

// DELETE /posts/:id/photos/:photoId → remove a photo from S3 and the DB.
// Ownership via the parent post; the photo is scoped to that post so you can't
// delete another post's photo through a post you happen to own.
router.delete(
  "/:id/photos/:photoId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id: postId, photoId } = req.params;
    await assertOwnsPost(postId, req.user!.id);

    const photo = await prisma.photo.findFirst({ where: { id: photoId, postId } });
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // S3 before DB so a row never points at a deleted object; DeleteObject is
    // idempotent, so a retry is safe. Week 6: also delete the WebP variant keys
    // (thumbnail/medium/full) here once the worker produces them.
    await s3.send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: photo.key }),
    );
    await prisma.photo.delete({ where: { id: photoId } });

    res.status(204).end();
  }),
);

// Photo posting
router.post(
  "/:id/photos/upload-url",
  authenticate,
  validate(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    await assertOwnsPost(postId, req.user!.id);
    const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
    const { contentType } = req.body as z.infer<typeof uploadUrlSchema>;
    const key = `photos/${postId}/${randomUUID()}.${EXT[contentType]}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return res.status(200).json({ data: { url, key } });
  }),
);

export default router;
