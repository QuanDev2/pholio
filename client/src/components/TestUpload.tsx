import useUpload from "../hooks/useUpload";

export default function TestUpload({ postId }: { postId: string }) {
  const { upload, progress, status } = useUpload();
  return (
    <>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && upload(postId, e.target.files[0])}
      />
      {status === "uploading" && <progress value={progress} max={100} />}
      {status === "success" && <span>✓ uploaded</span>}
    </>
  );
}
