import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import type { Photo } from "../../types";
import UploadItem from "./UploadItem";
import SavedPhotoTile from "./SavedPhotoTile";

export type PendingUpload = { id: string; file: File; previewUrl: string };

/**
 * The editor's photo section: a drag-and-drop area above a single filmstrip that
 * holds the post's saved photos AND any in-flight uploads together. On drop, each
 * file becomes a PendingUpload with an instant local objectURL preview and renders
 * as an UploadItem (one useUpload instance each → parallel S3 uploads) at the end
 * of the strip. Once uploaded + registered, the item removes itself and the
 * refetched photo takes its place as a SavedPhotoTile — one continuous row, no
 * jump between a separate "uploading" area and a separate "saved" area.
 */
export default function PhotoUploadZone({ postId, photos }: { postId: string; photos: Photo[] }) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [refused, setRefused] = useState<string[]>([]);

  // react-dropzone filters the drop against `accept` and hands the failures to
  // the SECOND argument. Those files never become an UploadItem, so without
  // this they'd disappear with no explanation — a silent failure.
  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    setRefused(rejections.map((r) => r.file.name));
    setPending((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }, []);

  const removePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center text-sm transition ${
          isDragActive
            ? "border-teal-500 bg-teal-50 text-teal-700"
            : "border-zinc-300 text-zinc-500 hover:border-zinc-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          "Drop photos here…"
        ) : (
          <>
            {/* Drag is desktop-only; on touch the zone is a tap-to-pick button. */}
            <span className="hidden sm:inline">Drag photos here, or click to choose</span>
            <span className="sm:hidden">Tap to add photos</span>
          </>
        )}
      </div>

      {refused.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          <p className="min-w-0 flex-1">
            Only JPEG, PNG and WebP images are supported. Skipped:{" "}
            <span className="break-words font-medium">{refused.join(", ")}</span>
          </p>
          <button
            type="button"
            onClick={() => setRefused([])}
            aria-label="Dismiss"
            className="-m-2 shrink-0 p-2 leading-none text-rose-500 hover:text-rose-700"
          >
            ×
          </button>
        </div>
      )}

      {/* One strip: saved photos first, then in-flight uploads at the end (the
          newest, matching createdAt order). When an upload registers, its tile
          self-removes and the refetched photo appears in the same spot. */}
      {(photos.length > 0 || pending.length > 0) && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => (
            <SavedPhotoTile key={photo.id} postId={postId} photo={photo} />
          ))}
          {pending.map((item) => (
            <div key={item.id} className="w-28 shrink-0">
              <UploadItem
                postId={postId}
                file={item.file}
                previewUrl={item.previewUrl}
                onDone={() => removePending(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
