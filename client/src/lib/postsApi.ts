import { api } from "./apiClient";
import type { Post } from "../types";

type PostResponse = { data: Post };

/**
 * Create a blank draft post. Called by the editor's draft-on-open flow: opening
 * /editor mints this draft so uploaded photos always have a postId to attach to.
 * The server sets published:false and seeds an empty content doc.
 */
export async function createDraft() {
  const res = await api.post<PostResponse>("/posts", {
    title: "Untitled",
    tags: [],
  });

  return res.data.data;
}

/**
 * Load one of the caller's own posts by id (used by the editor room,
 * /editor/:postId). Owner-scoped on the server (drafts included), so it can't
 * open another user's post. Uses /posts/mine/:id rather than /posts/:id to
 * avoid colliding with the public GET /posts/:slug route.
 */
export async function getPost(id: string) {
  const res = await api.get<PostResponse>(`/posts/mine/${id}`);

  return res.data.data;
}
