import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Photo } from "../../types";
import { updatePhotoCaption, deletePhoto } from "../../lib/postsApi";

/**
 * The post's saved photos — the durable counterpart to PhotoUploadZone. Reads
 * the post's own `photos` (already loaded with the post) and lets the owner edit
 * a photo's caption inline. This is the pool Week 7's inline-embed picker draws
 * from. Each tile reflects worker status: a pulsing skeleton while pending/
 * processing, the WebP thumbnail once ready, an error tile if processing failed.
 *
 * Laid out as a horizontal filmstrip: a single scrolling row of small fixed-size
 * thumbnails, so the staging area keeps a constant height and never pushes the
 * (Week 7) writing surface down the page, no matter how many photos are staged.
 */
export default function PhotoTray({ postId, photos }: { postId: string; photos: Photo[] }) {
  const queryClient = useQueryClient();

  // Which photo's caption is open for editing, and the in-progress draft text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Escape sets this so the blur that follows knows to discard instead of save.
  const cancelledRef = useRef(false);

  const mutation = useMutation({
    mutationFn: ({ photoId, caption }: { photoId: string; caption: string }) =>
      updatePhotoCaption(postId, photoId, caption),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deletePhoto(postId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
  });

  const startEdit = (photo: Photo) => {
    setEditingId(photo.id);
    setDraft(photo.caption ?? "");
  };

  // Single save path: Enter and blur both route here (Enter just blurs the
  // input). Skips the network call when nothing changed or Escape cancelled.
  const commit = (photo: Photo) => {
    setEditingId(null);
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const next = draft.trim();
    if (next !== (photo.caption ?? "")) {
      mutation.mutate({ photoId: photo.id, caption: next });
    }
  };

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {photos.map((photo) => (
        <div key={photo.id} className="flex w-28 shrink-0 flex-col gap-1.5">
          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100">
            {photo.status === "error" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-rose-600">
                <span className="text-lg leading-none">⚠</span>
                <span className="text-[10px] leading-tight">Processing failed</span>
              </div>
            ) : (
              <>
                {/* Show the original right away; swap to the WebP thumbnail once ready. */}
                <img
                  src={photo.status === "ready" ? (photo.thumbnailUrl ?? photo.url) : photo.url}
                  alt={photo.caption ?? ""}
                  className="h-full w-full object-cover"
                />
                {/* While the worker runs, dim the original and show a spinner. */}
                {photo.status !== "ready" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <span className="text-[10px] font-medium text-white">Processing…</span>
                  </div>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => deleteMutation.mutate(photo.id)}
              disabled={deleteMutation.isPending}
              aria-label="Delete photo"
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 pb-0.5 text-2xl leading-none text-white hover:bg-black/80 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {editingId === photo.id ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(photo)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  cancelledRef.current = true;
                  e.currentTarget.blur();
                }
              }}
              placeholder="Add a caption…"
              className="w-full rounded border border-zinc-300 px-1.5 py-1 text-xs focus:border-teal-500 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(photo)}
              className="block w-full truncate rounded px-1.5 py-1 text-left text-xs text-zinc-600 hover:bg-zinc-100"
            >
              {photo.caption ? (
                photo.caption
              ) : (
                <span className="text-zinc-400">Add a caption…</span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
