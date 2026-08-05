import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import UploadItem from "./UploadItem";

export type PendingUpload = { id: string; file: File; previewUrl: string };

/**
 * The drag-and-drop upload area inside the editor. On drop, each file becomes a
 * PendingUpload with an instant local objectURL preview, then renders as an
 * UploadItem — one useUpload instance each, so drops upload to S3 in parallel.
 * An item removes itself (onDone) once it's uploaded, registered, and folded
 * into the saved-photo tray.
 */
export default function PhotoUploadZone({ postId }: { postId: string }) {
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

      {/* In-flight previews as the same small filmstrip as the saved tray, so a
          finished upload doesn't visibly jump from a big tile to a small one. */}
      {pending.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
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
