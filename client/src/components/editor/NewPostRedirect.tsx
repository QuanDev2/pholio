import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDraft } from "../../lib/postsApi";

/**
 * The editor "turnstile" — /editor (no id). Mints a fresh draft post and
 * immediately redirects to /editor/:postId, so every upload has a post to
 * attach to (draft-on-open). Renders nothing meaningful; you pass through it.
 *
 * StrictMode note: effects double-invoke in dev, which would create TWO drafts
 * on every open. The `hasCreated` ref latches after the first run (it persists
 * across the double-invoke on the same fiber) so exactly one draft is minted.
 *
 * `replace: true` keeps this route out of history — otherwise Back would land
 * here again and mint yet another draft.
 */
export default function NewPostRedirect() {
  const navigate = useNavigate();
  const hasCreated = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (hasCreated.current) return;
    hasCreated.current = true;

    createDraft()
      .then((post) => navigate(`/editor/${post.id}`, { replace: true }))
      .catch(() => setFailed(true));
  }, [navigate]);

  if (failed) return <div className="text-red-600">Could not start a new post. Try again.</div>;
  return <div className="text-zinc-500">Creating draft…</div>;
}
