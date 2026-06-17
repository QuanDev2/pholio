import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'
import { serializePost, postInclude } from '../lib/serializers'
import slugify from 'slugify'
import { nanoid } from 'nanoid'

// Mounted at /posts in app.ts — paths here are RELATIVE to that prefix.
const router = Router()

// --- Post reads (public) ---

// GET /posts → the /explore world feed (published posts of all users)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const where = { published: true }
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: where,
        orderBy: { createdAt: 'desc' },
        include: postInclude
      }),
      prisma.post.count({ where: where })
    ])

    return res.json({ data: posts.map(serializePost), total, page, limit })
  })
)

// GET /posts/mine → caller's own posts incl. drafts.
// MUST be registered before '/:slug', else 'mine' matches the :slug param.
// Stubbed public for now; locked to the authenticated author in Week 4 Day 3.
router.get(
  '/mine',
  asyncHandler(async (_req, res) => {
    res.json({ data: [], message: 'my posts stub (auth lands Week 4)' })
  })
)

// GET /posts/:slug → single post with photos + tags + author
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug

    const post = await prisma.post.findUnique({
      where: { slug: slug },
      include: postInclude
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json({ data: serializePost(post) })
  })
)

// --- Post writes ---

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, authorId } = req.body
    const tags = req.body.tags ?? []

    const base = slugify(title, { lower: true, strict: true })
    const slug = `${base}-${nanoid(6)}`

    const allowedTags = await prisma.tag.findMany({
      where: {
        id: { in: tags }
      }
    })

    if (allowedTags.length !== tags.length) {
      return res.status(400).json({ error: 'unknown tag' })
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: { type: 'doc', content: [] },
        published: false,
        author: { connect: { id: authorId } },
        tags: {
          connect: tags.map((id: string) => ({ id }))
        }
      },
      include: postInclude
    })

    res.status(201).json({ data: serializePost(post) })
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const { title, content, published } = req.body

    let post
    try {
      post = await prisma.post.update({
        where: { id },
        data: { title, content, published },
        include: postInclude
      })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'post not found' })
      }
      throw err
    }

    res.status(200).json({ data: serializePost(post) })
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ message: 'delete post stub', id: req.params.id })
  })
)

// --- Nested photo writes (real S3-backed logic in Week 5) ---
// A photo is always addressed through its parent post: Photo.postId is required.

router.post(
  '/:id/photos',
  asyncHandler(async (req, res) => {
    res.status(201).json({ message: 'add photo stub', postId: req.params.id })
  })
)

router.patch(
  '/:id/photos/:photoId',
  asyncHandler(async (req, res) => {
    res.json({
      message: 'update photo stub',
      postId: req.params.id,
      photoId: req.params.photoId
    })
  })
)

router.delete(
  '/:id/photos/:photoId',
  asyncHandler(async (req, res) => {
    res.json({
      message: 'delete photo stub',
      postId: req.params.id,
      photoId: req.params.photoId
    })
  })
)

export default router
