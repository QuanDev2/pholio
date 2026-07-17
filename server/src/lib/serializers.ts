import { Prisma, Photo } from "../generated/prisma/client";

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
export function serializePost<T extends { tags: { name: string }[]; photos: Photo[] }>(post: T) {
  return {
    ...post,
    photos: post.photos.map((photo) => ({
      ...photo,
      url: `https://picsum.photos/seed/${photo.id}/800/600`,
    })),
    tags: post.tags.map((tag) => tag.name),
  };
}
