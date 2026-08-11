import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPost } from "../../lib/postsApi";
import PhotoUploadZone from "./PhotoUploadZone";
import PhotoTray from "./PhotoTray";

/**
 * The editor "room" — /editor/:postId. Loads an existing post (draft or
 * published) and renders its editing surface. Reached two ways: from the
 * draft-on-open redirect (a brand-new draft) and directly when editing later.
 *
 * Today this is the minimal shell: a title input + a placeholder photo area.
 * Week 7 layers the Tiptap rich-text body on top of this same component.
 */
export default function Editor() {
  const { postId } = useParams();

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId!),
    enabled: Boolean(postId),
    // Poll while any photo is still being processed by the worker, so its
    // thumbnail appears automatically. Stop once every photo is settled
    // (ready or error) — otherwise the frontend never learns the job finished.
    refetchInterval: (query) => {
      const unsettled = query.state.data?.photos.some(
        (p) => p.status === "pending" || p.status === "processing",
      );
      return unsettled ? 2000 : false;
    },
  });

  // Local, uncontrolled-by-server title state. Seeded once the post loads.
  // Autosave (PATCH back to the server) is Week 7 — today the field just works.
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (post) setTitle(post.title);
  }, [post]);

  if (isLoading) return <div className="text-zinc-500">Loading editor…</div>;
  if (isError || !post) return <div className="text-red-600">Could not load this post.</div>;

  return (
    <div className="flex flex-col gap-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full border-0 border-b border-zinc-200 bg-transparent pb-2 text-3xl font-bold text-zinc-950 focus:border-zinc-400 focus:outline-none"
      />

      {/* Photo area: uploads-in-flight (zone) above the post's saved photos (tray). */}
      <PhotoUploadZone postId={post.id} />
      <PhotoTray postId={post.id} photos={post.photos} />
    </div>
  );
}
