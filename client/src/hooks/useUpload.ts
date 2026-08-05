import { useState } from "react";
import { api } from "../lib/apiClient";

// "rejected" is a PERMANENT failure — the file itself is unacceptable, so
// retrying the same File is pointless. "error" is a transient failure (network,
// S3, a 500) where a retry is meaningful. The UI branches on this.
type UploadStatus = "idle" | "uploading" | "success" | "error" | "rejected";

// Must match the server's uploadUrlSchema z.enum — the presigned URL is signed
// for one Content-Type, so anything off this list can't be uploaded anyway.
// This copy exists to fail FAST (before any network call) with a friendly message.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// 10MB. A presigned PUT is signed for a content-type, NOT a byte ceiling — S3
// will happily accept a 4GB object. Since Express is not in the byte path,
// this check is the only thing bounding what lands in the bucket.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

// Returns a user-facing message if the file is unacceptable, else null.
// MIME here is the browser's *label* for the file, not its content — a renamed
// file can lie. Real content inspection (magic bytes) belongs in the Week 6
// worker; this gate is UX for honest users plus a hard size bound.
export const validateFile = (file: File): string | null => {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPEG, PNG and WebP images are supported.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Image is ${formatMb(file.size)}MB — the limit is ${formatMb(MAX_FILE_SIZE)}MB.`;
  }
  return null;
};

const getUploadUrl = async (postId: string, fileType: string) => {
  const res = await api.post(`posts/${postId}/photos/upload-url`, { contentType: fileType });
  return { url: res.data.data.url, key: res.data.data.key };
};

const putToS3 = (url: string, file: File, setProgress: (pct: number) => void) => {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (p) => setProgress(Math.round((p.loaded / p.total) * 100));
    xhr.onload = () => {
      xhr.status < 300 ? resolve() : reject(new Error("S3 " + xhr.status));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
};

export default function useUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setError(null);
  };

  const upload = async (postId: string, file: File) => {
    // Pre-flight: reject BEFORE minting a presigned URL. Once that URL exists
    // the upload is out of our hands — no server sits between the browser and
    // S3 to stop it. Costs the user zero bytes of (mobile) data.
    const rejection = validateFile(file);
    if (rejection) {
      setStatus("rejected");
      setProgress(0);
      setError(rejection);
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError(null);
    try {
      const { url, key } = await getUploadUrl(postId, file.type);
      await putToS3(url, file, setProgress);
      setStatus("success");
      return key;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return { upload, progress, status, error, reset };
}
