import { api } from "./apiClient";
import type { Post, Photo } from "../types";

type PostResponse = { data: Post };
type PhotoResponse = { data: Photo };

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

/**
 * Update a post's title and/or content (Tiptap JSON). Used by the editor's
 * save flow — manual save today, auto-save from Week 7 Day 2.
 */
export async function updatePost(id: string, data: { title?: string; content?: unknown }) {
  const res = await api.patch<PostResponse>(`/posts/${id}`, data);

  return res.data.data;
}

/**
 * Register an already-uploaded S3 object as a Photo on the post. Called after
 * the file has been PUT to S3 (via useUpload), passing back the S3 `key` and the
 * client-assigned `position` (display order — the client knows drop order; the
 * server just stores it). The server sets status:'pending'.
 */
export async function registerPhoto(postId: string, key: string, position: number) {
  const res = await api.post<PhotoResponse>(`/posts/${postId}/photos`, { key, position });

  return res.data.data;
}

/**
 * Update a photo's caption. Scoped to the post on the server (a photo not on
 * this post 404s), so the tray's inline caption edit can only touch its own
 * post's photos. Returns the updated Photo.
 */
export async function updatePhotoCaption(postId: string, photoId: string, caption: string) {
  const res = await api.patch<PhotoResponse>(`/posts/${postId}/photos/${photoId}`, { caption });

  return res.data.data;
}

/**
 * Delete a photo from S3 and the DB. Scoped to the post on the server. Returns
 * nothing (204).
 */
export async function deletePhoto(postId: string, photoId: string) {
  await api.delete(`/posts/${postId}/photos/${photoId}`);
}
