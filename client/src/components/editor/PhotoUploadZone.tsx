import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import type { Photo } from "../../types";
import UploadItem from "./UploadItem";
import SavedPhotoTile from "./SavedPhotoTile";

export type PendingUpload = { id: string; file: File; previewUrl: string; position: number };

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
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setRefused(rejections.map((r) => r.file.name));
      setPending((prev) => {
        // Assign positions above everything already here (saved + in-flight), in
        // drop order — so this batch lands at the end of the strip and keeps its
        // order regardless of which upload finishes first.
        const taken = [...photos.map((p) => p.position), ...prev.map((p) => p.position)];
        const base = taken.length ? Math.max(...taken) + 1 : 0;
        return [
          ...prev,
          ...accepted.map((file, i) => ({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            position: base + i,
          })),
        ];
      });
    },
    [photos],
  );

  const removePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
  });

  // Saved photos and in-flight uploads as one list, ordered by position.
  const strip = [
    ...photos.map((photo) => ({ kind: "saved" as const, position: photo.position, photo })),
    ...pending.map((upload) => ({ kind: "pending" as const, position: upload.position, upload })),
  ].sort((a, b) => a.position - b.position);

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

      {/* One strip, saved photos and in-flight uploads interleaved by position so
          the order is stable even mid-upload (a photo that registers first can't
          jump ahead of a lower-positioned sibling still uploading). When an
          upload registers, its tile self-removes and the refetched photo takes
          the same slot. */}
      {strip.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {strip.map((item) =>
            item.kind === "saved" ? (
              <SavedPhotoTile key={item.photo.id} postId={postId} photo={item.photo} />
            ) : (
              <div key={item.upload.id} className="w-28 shrink-0">
                <UploadItem
                  postId={postId}
                  file={item.upload.file}
                  previewUrl={item.upload.previewUrl}
                  position={item.upload.position}
                  onDone={() => removePending(item.upload.id)}
                />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
