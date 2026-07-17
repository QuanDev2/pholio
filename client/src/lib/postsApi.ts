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
 * Load a single post by id (used by the editor room, /editor/:postId).
 *
 * NOTE: path is provisional. The backend currently exposes GET /posts/:slug,
 * which collides with a by-id route in the same position — the editor's by-id
 * fetch needs a disambiguated backend route before this resolves. Update the
 * path here once that's settled.
 */
export async function getPost(id: string) {
  const res = await api.get<PostResponse>(`/posts/${id}`);

  return res.data.data;
}
