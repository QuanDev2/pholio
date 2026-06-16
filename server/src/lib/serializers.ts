// Shapes a Prisma post (with included relations) into the API response shape.
// The only transform right now: flatten the `tags` join relation (Tag[]) down to
// plain tag names (string[]), so the client never sees the join-table structure.
//
// Generic over the post shape: it accepts anything that has `tags: { name }[]`
// and returns the same object with `tags` replaced by string[], preserving every
// other field (photos, author, etc.) regardless of what was included.
export function serializePost<T extends { tags: { name: string }[] }>(post: T) {
  return {
    ...post,
    tags: post.tags.map((tag) => tag.name)
  }
}
