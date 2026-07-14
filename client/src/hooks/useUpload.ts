import { useState } from "react";
import { api } from "../lib/apiClient";

type UploadStatus = "idle" | "uploading" | "success" | "error";

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
