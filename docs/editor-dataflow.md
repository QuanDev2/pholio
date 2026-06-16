# Editor Dataflow — draft → upload → publish

How a post and its photos get created. The key idea: **the post row is created the
moment the editor opens (an empty draft), before the user writes anything** — so every
photo always has a `postId` to attach to (`Photo.postId` is required).

Built across three weeks:
- **Week 3** — draft create (`POST /posts`) + autosave (`PATCH /posts/:id`)
- **Week 5** — presigned S3 upload + photo registration
- **Week 6** — background worker (resize + EXIF)

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
    Worker->>Worker: resize + extract EXIF
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
- **Worker** only *processes* the image (resize, EXIF). It does **not** attach photos to
  posts. Easy to conflate — keep them separate.
- (A browser **Service Worker** is an unrelated thing — a client-side network proxy. The
  background image processor here is just a server-side queue consumer.)
