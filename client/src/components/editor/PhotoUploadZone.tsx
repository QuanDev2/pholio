import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export type PendingUpload = { id: string; file: File; previewUrl: string };

/**
 * The drag-and-drop upload area inside the editor. On drop, each file becomes a
 * PendingUpload with an instant local objectURL preview. (Actual S3 upload +
 * registration is added in S3 via a per-file UploadItem — one useUpload hook
 * each, so drops upload in parallel.)
 */
export default function PhotoUploadZone({ postId }: { postId: string }) {
  void postId; // used in S3 when uploads are wired up
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setPending((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
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

      {pending.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {pending.map((item) => (
            <img
              key={item.id}
              src={item.previewUrl}
              alt=""
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
