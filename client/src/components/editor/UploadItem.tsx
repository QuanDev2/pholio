import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useUpload from "../../hooks/useUpload";
import { registerPhoto } from "../../lib/postsApi";

type Props = {
  postId: string;
  file: File;
  previewUrl: string;
  onDone: () => void;
};

/**
 * One in-flight upload. Rendered per dropped file (see PhotoUploadZone), so each
 * file gets its own useUpload instance and they upload in parallel. Drives the
 * full flow on mount: PUT to S3 → register the DB row → refresh the tray → hand
 * back to the parent to remove itself. On any failure it stays put with a retry.
 */
export default function UploadItem({ postId, file, previewUrl, onDone }: Props) {
  const { upload, progress, status, error, reset } = useUpload();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setRegisterError(null);
    const key = await upload(postId, file);
    if (!key) return; // upload failed — useUpload already set status:error

    try {
      await registerPhoto(postId, key);
    } catch {
      setRegisterError("Could not save photo");
      return;
    }

    // Persisted: refresh the saved-photo tray, drop the preview, self-remove.
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
    URL.revokeObjectURL(previewUrl);
    onDone();
  }, [upload, postId, file, previewUrl, onDone, queryClient]);

  // Fire once. The ref latch keeps StrictMode's double-mount (and re-runs from
  // run's identity changing) from double-uploading.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void run();
  }, [run]);

  const retry = () => {
    reset();
    setRegisterError(null);
    void run();
  };

  const failed = status === "error" || registerError !== null;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md">
      <img src={previewUrl} alt="" className="h-full w-full object-cover" />

      {status === "uploading" && (
        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1.5">
          <div className="h-1 w-full overflow-hidden rounded bg-white/30">
            <div
              className="h-full rounded bg-teal-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {failed && (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-2 text-center text-xs text-white"
        >
          <span>{error ?? registerError}</span>
          <span className="font-medium underline">Retry</span>
        </button>
      )}
    </div>
  );
}
