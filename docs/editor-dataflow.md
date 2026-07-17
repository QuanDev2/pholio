# Editor Dataflow — draft → upload → publish

How a post and its photos get created. The key idea: **the post row is created the
moment the editor opens (an empty draft), before the user writes anything** — so every
photo always has a `postId` to attach to (`Photo.postId` is required).

Built across three weeks:
- **Week 3** — draft create (`POST /posts`) + autosave (`PATCH /posts/:id`)
- **Week 5** — presigned S3 upload + photo registration
- **Week 6** — background worker (resize)

```mermaid
sequenceDiagram
    actor User
    participant Editor as Editor (browser)
    participant API as Express API
    participant S3
    participant Worker as Worker (Wk6)

    Note over Editor,API: Week 3 — draft + autosave
    User->>Editor: click "Create Post"
    Editor->>API: POST /posts
    API-->>Editor: { id }  (draft, published:false)
    Note over Editor: redirect /editor/:id
    User->>Editor: type text
    Editor->>API: PATCH /posts/:id (autosave content)

    Note over Editor,Worker: Week 5 + 6 — per photo, as dropped
    User->>Editor: drop a photo
    Editor->>API: POST /posts/:id/photos/presign
    API-->>Editor: { url, key }
    Editor->>S3: PUT file (bytes skip Express)
    S3-->>Editor: 200
    Editor->>API: POST /posts/:id/photos { key }
    API-->>Editor: { photo } (status:pending)
    API->>Worker: enqueue job
    Worker->>Worker: resize
    Worker->>API: update photo (status:ready, size URLs)

    Note over User,API: Week 3 — publish is just a flag flip
    User->>Editor: click Publish
    Editor->>API: PATCH /posts/:id (published:true)
    Note right of API: validate 1+ photo
    API-->>Editor: { post } — now on /explore
```

## Three things to remember

1. **The post row is born first.** Everything else hangs off its `id`. There's never a
   moment with photos-in-hand but no post.
2. **File bytes bypass Express.** The browser `PUT`s straight to S3 via a presigned URL.
   Express only ever handles small JSON (the presign request and the key registration).
3. **Publish is trivial** — one boolean. All the real data (content + photos) was
   persisted incrementally during editing, so drafts "just work."

## Who does what

- **Client (editor)** orchestrates: presign → upload → register the key. It *attaches*
  photos to the post, one at a time, as each finishes uploading.
- **Worker** only *processes* the image (resize). It does **not** attach photos to
  posts. Easy to conflate — keep them separate.
- (A browser **Service Worker** is an unrelated thing — a client-side network proxy. The
  background image processor here is just a server-side queue consumer.)

---

## "Write with AI" — the AI-seeded draft (post generation)

The AI post-generation feature is **not a second editor**. There is one editor and one
canonical format (Tiptap JSON + `Photo` rows). "Write with AI" just *pre-fills* it. The
AI work runs in **beef-broth** (Pholio's Python AI service); Pholio triggers it and applies
the result.

Precondition: **photos are uploaded first** (the flow above). Then the button writes.

```mermaid
sequenceDiagram
    actor User
    participant Editor as Editor (browser)
    participant API as Express API
    participant Queue as BullMQ
    participant BB as beef-broth (Python)

    Note over User,Editor: photos already uploaded to the draft
    User->>Editor: click "Write with AI" (keywords, tone, length)
    alt draft already has content
        Editor->>User: confirm "This will replace your draft"
    end
    Note over Editor: editor LOCKS ("Generating…") — user can't type
    Editor->>API: POST /posts/:id/generate { keywords, tone, length }
    API->>Queue: enqueue generate-post job
    Queue->>BB: POST /generate-post { photos, keywords, tone, length }
    Note right of BB: caption photos → write beats →<br/>match photos to beats (grounded)
    BB-->>Queue: { title, sections[], photoAssignments[], tags[] }
    Queue->>API: convert → Tiptap doc + set Photo positions/embeds
    API-->>Editor: draft filled (poll/notify)
    Note over Editor: editor UNLOCKS, populated
    User->>Editor: edit / publish as normal
```

### Things to remember

1. **One editor, two doors.** Manual typing and AI generation both produce the same
   `content` (Tiptap JSON) + `Photo` rows. The AI draft is just a pre-filled manual draft.
2. **Confirm up front, lock during.** The overwrite confirm fires *before* generation; the
   editor is locked *during* it. So nothing the user types can be clobbered mid-run.
3. **Async + walk-away.** The job runs on BullMQ (20-30s). If the user closes the tab, the
   job still finishes and they return to a filled draft.
4. **Grounded only.** beef-broth writes from keywords + photo captions, never invents. If
   keywords are thin it writes shorter rather than padding.
5. **Photo placement.** `photoAssignments` pair each photo to the beat it illustrates
   (embedding similarity: `beat_summary` vs caption). Pholio turns those into `PhotoEmbed`
   nodes placed after each beat. See beef-broth `design/overview.md`.
