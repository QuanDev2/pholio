import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useUpload from "../../hooks/useUpload";
import { registerPhoto } from "../../lib/postsApi";

type Props = {
  postId: string;
  file: File;
  previewUrl: string;
  position: number;
  onDone: () => void;
};

/**
 * One in-flight upload. Rendered per dropped file (see PhotoUploadZone), so each
 * file gets its own useUpload instance and they upload in parallel. Drives the
 * full flow on mount: PUT to S3 → register the DB row → refresh the tray → hand
 * back to the parent to remove itself. On a transient failure it stays put with
 * a retry; on a rejection (bad type / too big) retrying is pointless, so the
 * overlay offers Dismiss instead.
 */
export default function UploadItem({ postId, file, previewUrl, position, onDone }: Props) {
  const { upload, progress, status, error, reset } = useUpload();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setRegisterError(null);
    const key = await upload(postId, file);
    if (!key) return; // upload failed — useUpload already set status:error

    try {
      await registerPhoto(postId, key, position);
    } catch {
      setRegisterError("Could not save photo");
      return;
    }

    // Persisted: refresh the saved-photo tray, drop the preview, self-remove.
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
    URL.revokeObjectURL(previewUrl);
    onDone();
  }, [upload, postId, file, previewUrl, position, onDone, queryClient]);

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

  // The file was never acceptable (bad type / too big), so there is nothing to
  // retry — the only move is to drop the tile. Revoke here too: the success path
  // does it in run(), but a file that never uploads would otherwise hold its
  // blob in memory until the page unloads.
  const dismiss = () => {
    URL.revokeObjectURL(previewUrl);
    onDone();
  };

  const rejected = status === "rejected";
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

      {(failed || rejected) && (
        <button
          type="button"
          onClick={rejected ? dismiss : retry}
          // min-h-11 keeps the tap target at the ~44px touch minimum even though
          // the tile is small; the message can wrap to two lines on a phone.
          className="absolute inset-0 flex min-h-11 flex-col items-center justify-center gap-1 bg-black/70 p-1.5 text-center text-[11px] leading-tight text-white"
        >
          <span className="line-clamp-3">{error ?? registerError}</span>
          <span className="font-medium underline">{rejected ? "Dismiss" : "Retry"}</span>
        </button>
      )}
    </div>
  );
}
