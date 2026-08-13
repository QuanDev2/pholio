import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import { getPost, updatePost } from "../../lib/postsApi";
import type { Post } from "../../types";
import PhotoUploadZone from "./PhotoUploadZone";

// Formatting controls — each button toggles a mark/node and highlights when active.
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

// The editor room at /editor/:postId — loads a post and renders its editing surface.
export default function Editor() {
  const { postId } = useParams();
  const queryClient = useQueryClient();

  // Load the post, polling every 2s while any photo is still being processed.
  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId!),
    enabled: Boolean(postId),
    refetchInterval: (query) => {
      const unsettled = query.state.data?.photos.some(
        (p) => p.status === "pending" || p.status === "processing",
      );
      return unsettled ? 2000 : false;
    },
  });

  // Seed the title once per post so a poll refetch can't overwrite in-progress typing.
  const [title, setTitle] = useState("");
  const seededPostId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (post && seededPostId.current !== post.id) {
      seededPostId.current = post.id;
      setTitle(post.title);
    }
  }, [post]);

  // Dirty tracking: unsaved edits exist whenever revision has moved past savedRevision.
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const markDirty = () => setRevision((r) => r + 1);

  // Tiptap instance, re-created per post id; every content change marks the doc dirty.
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: post?.content as JSONContent | undefined,
      onUpdate: markDirty,
    },
    [post?.id],
  );

  // PATCH title + body; the revision travels along so success records what was sent.
  const { mutate: save, isPending: isSaving } = useMutation<Post, Error, number>({
    mutationFn: () => updatePost(postId!, { title, content: editor?.getJSON() }),
    onSuccess: (updated, savedAt) => {
      setSavedRevision(savedAt);
      // Keep the cached photos — the response re-signs their URLs and would reload them.
      queryClient.setQueryData(["post", postId], (prev: Post | undefined) =>
        prev ? { ...prev, ...updated, photos: prev.photos } : updated,
      );
    },
  });

  // Auto-save: the cleanup cancels the pending timer on each edit, debouncing to 2s idle.
  useEffect(() => {
    if (revision === savedRevision || isSaving) return;
    const timer = setTimeout(() => save(revision), 2000);
    return () => clearTimeout(timer);
  }, [revision, savedRevision, isSaving, save]);

  if (isLoading) return <div className="text-zinc-500">Loading editor…</div>;
  if (isError || !post || !editor) return <div className="text-red-600">Could not load this post.</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Post title — plain state, so it has to mark itself dirty for auto-save. */}
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markDirty();
        }}
        placeholder="Untitled"
        className="w-full border-0 border-b border-zinc-200 bg-transparent pb-2 text-3xl font-bold text-zinc-950 focus:border-zinc-400 focus:outline-none"
      />

      {/* Body: toolbar + manual save above the editable Tiptap surface. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <EditorToolbar editor={editor} />
          <button
            type="button"
            onClick={() => save(revision)}
            disabled={isSaving}
            className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
        <EditorContent
          editor={editor}
          className="prose prose-zinc max-w-none prose-p:my-2 [&_li>p]:my-0 min-h-48 rounded border border-zinc-200 p-3 focus-within:border-zinc-400 [&_.tiptap]:outline-none"
        />
      </div>

      {/* Dropzone above one strip of saved photos and in-flight uploads. */}
      <PhotoUploadZone postId={post.id} photos={post.photos} />
    </div>
  );
}
