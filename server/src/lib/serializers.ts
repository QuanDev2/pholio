import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma, Photo } from "../generated/prisma/client";
import { s3 } from "./s3";

// The relations every post-returning endpoint hydrates before serializing.
// Pass as `include: postInclude` to findMany/findUnique/create/update so the
// returned object always carries photos (createdAt-ordered), author, and tags —
// the exact shape serializePost expects.
//
// `satisfies` (not a plain `: Prisma.PostInclude` annotation) type-checks the
// object while preserving its literal type, so Prisma can still infer the precise
// return shape — without it, the relations would widen and serializePost would
// lose its types.
export const postInclude = {
  photos: { orderBy: { createdAt: "asc" } },
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      profilePictureUrl: true,
      bio: true,
    },
  },
  tags: true,
} satisfies Prisma.PostInclude;

// Shapes a Prisma post (with included relations) into the API response shape.
// The only transform right now: flatten the `tags` join relation (Tag[]) down to
// plain tag names (string[]), so the client never sees the join-table structure.
//
// Generic over the post shape: it accepts anything that has `tags: { name }[]`
// and returns the same object with `tags` replaced by string[], preserving every
// other field (photos, author, etc.) regardless of what was included.
export async function serializePost<T extends { tags: { name: string }[]; photos: Photo[] }>(
  post: T,
) {
  return {
    ...post,
    // The bucket is private, so a raw S3 URL would 403. Sign a short-lived GET
    // URL per photo instead — the signature (in the query string) is the
    // credential, valid for an hour, long enough to outlive any page view.
    photos: await Promise.all(
      post.photos.map(async (photo) => ({
        ...photo,
        url: await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: photo.key }),
          { expiresIn: 3600 },
        ),
      })),
    ),
    tags: post.tags.map((tag) => tag.name),
  };
}
