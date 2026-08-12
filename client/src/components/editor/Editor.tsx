import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import { getPost, updatePost } from "../../lib/postsApi";
import PhotoUploadZone from "./PhotoUploadZone";

/** Minimal formatting toolbar — bold/italic, headings, lists. */
function EditorToolbar({ editor }: { editor: TiptapEditor }) {
  const buttonClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm font-medium ${
      active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
    }`;

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive("bulletList"))}
      >
        Bullet List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive("orderedList"))}
      >
        Ordered List
      </button>
    </div>
  );
}

/**
 * The editor "room" — /editor/:postId. Loads an existing post (draft or
 * published) and renders its editing surface. Reached two ways: from the
 * draft-on-open redirect (a brand-new draft) and directly when editing later.
 */
export default function Editor() {
  const { postId } = useParams();
  const queryClient = useQueryClient();

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
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (post) setTitle(post.title);
  }, [post]);

  // Deps on post?.id so the editor re-initializes with the right content when
  // the post finishes loading (and if the route ever swaps to a different post).
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: post?.content as JSONContent | undefined,
    },
    [post?.id],
  );

  const saveMutation = useMutation({
    mutationFn: () => updatePost(postId!, { title, content: editor?.getJSON() }),
    onSuccess: (updated) => queryClient.setQueryData(["post", postId], updated),
  });

  if (isLoading) return <div className="text-zinc-500">Loading editor…</div>;
  if (isError || !post || !editor) return <div className="text-red-600">Could not load this post.</div>;

  return (
    <div className="flex flex-col gap-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full border-0 border-b border-zinc-200 bg-transparent pb-2 text-3xl font-bold text-zinc-950 focus:border-zinc-400 focus:outline-none"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <EditorToolbar editor={editor} />
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
        <EditorContent
          editor={editor}
          className="prose prose-zinc max-w-none prose-p:my-2 [&_li>p]:my-0 min-h-48 rounded border border-zinc-200 p-3 focus-within:border-zinc-400 [&_.tiptap]:outline-none"
        />
      </div>

      {/* Photo area: dropzone above one strip of saved photos + in-flight uploads. */}
      <PhotoUploadZone postId={post.id} photos={post.photos} />
    </div>
  );
}
