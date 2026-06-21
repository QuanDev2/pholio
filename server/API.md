# Pholio API

Base URL: `http://localhost:4000/api/v1`

All responses are JSON. List endpoints return an offset-paginated envelope
(`{ data, total, page, limit }`); single-resource endpoints return `{ data }`.

> **Status:** stub (Week 3 Day 5). The **Cache profile** column below is the
> Day-5 system-design deliverable (read-heavy/cacheable vs write-heavy). Full
> request/response schemas are filled in Day 7.

## Cache profile — why it's here

For every endpoint, one question: _can this response be served from a cache
instead of hitting Postgres?_ Reads vastly outnumber writes, so caching the
read-heavy ones is the cheapest way to cut DB load. A **write** is never cached —
it's what **invalidates** a cache. The hard part is invalidation: knowing which
cached entries go stale on a write (a `PATCH /posts/:id` must drop the cached
single post _and_ any feed page it appears on). Drives Week 8 (HTTP cache /
Redis) and Week 9 (CloudFront/CDN).

Note: a `GET` is **not** automatically cacheable — "cacheable" means _the same
response for every caller_. `GET /posts/mine` is per-user, so it can't share a cache.

## Endpoints

| Method | Path                         | Auth     | Cache profile                  | Notes                                                         |
| ------ | ---------------------------- | -------- | ------------------------------ | ------------------------------------------------------------- |
| GET    | `/posts`                     | public   | read-heavy · cacheable         | explore feed (published only); short TTL so new posts surface |
| GET    | `/posts/:slug`               | public   | read-heavy · cacheable         | single post; invalidate on its PATCH/DELETE                   |
| GET    | `/users/:username/posts`     | public   | read-heavy · cacheable         | portfolio feed (one author, published only)                   |
| GET    | `/posts/mine`                | (Week 4) | read-heavy · **not** cacheable | per-caller — varies by auth; stubbed public until Week 4      |
| POST   | `/posts`                     | (Week 4) | write-heavy                    | creates a draft; invalidates feed caches                      |
| PATCH  | `/posts/:id`                 | (Week 4) | write-heavy                    | invalidates that post + any feed it appears on                |
| DELETE | `/posts/:id`                 | (Week 4) | write-heavy                    | cascade-deletes photos; invalidates post + feeds             |
| POST   | `/posts/:id/photos`          | (Week 4) | write-heavy                    | stub until Week 5 (S3 upload)                                 |
| PATCH  | `/posts/:id/photos/:photoId` | (Week 4) | write-heavy                    | stub until Week 5                                             |
| DELETE | `/posts/:id/photos/:photoId` | (Week 4) | write-heavy                    | stub until Week 5                                             |


<!--
WRITING DESIGN DOC
-----------------------------------
Goal: someone can call any endpoint correctly
WITHOUT reading the route code. Two layers:

  1. COMMON SHAPES (write once) — the objects that repeat everywhere:
     the Post response object, the list envelope, the error envelope.
     Document them ONCE here, then reference them by name from each endpoint
     ("returns a Post", "returns a list envelope of Post[]") instead of
     re-pasting the whole shape every time. DRY applies to docs too.

  2. PER-ENDPOINT (write per route) — what's unique to that one route.
     Use this exact template for EVERY endpoint so the doc is scannable:

        ### `METHOD /path`

        One sentence: what it does and which surface uses it.

        - **Auth:** public | authenticated (note Week 4 if it changes)
        - **Path params:** `name` — meaning   (omit if none)
        - **Query params:** `name` (default …) (omit if none)
        - **Request body:** name the Zod schema, then the shape (omit for GET/DELETE)
        - **2xx:** status + body shape (reference a common shape by name)
        - **4xx:** each error this route can return, with status + body

WHERE TO READ THE TRUTH (don't guess — copy from source):
  - response Post shape  → src/lib/serializers.ts (postInclude + serializePost)
  - request body rules   → src/schemas/posts.ts (createPostSchema, updatePostSchema)
  - status codes & errors→ the route handlers in src/routes/posts.ts, users.ts
  - error envelope shape → src/middleware/errorHandler.ts
  - field types          → prisma/schema.prisma

GOTCHAS worth a one-line callout when you hit them:
  - serializePost flattens tags → string[] and injects a placeholder photo `url`
  - author.select hides password + email — say so (security decision)
  - POST /posts takes authorId in the body today; becomes req.user.id in Week 4
-->

## Common shapes

### Post (response object)

<!-- The object inside `data` for every post-returning endpoint.
     Copy the real fields from serializePost + postInclude. Note the tag-flatten
     and the injected photo `url`. Show one photo and the trimmed author. -->

```jsonc
{
  "id": "clx...",
  "slug": "district-1-night",
  "title": "District 1 at Night",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "text": "The city never sleeps.",
            "type": "text"
          }
        ]
      } // Tiptap rich-text JSON
    ]
  },
  "authorId": "clx...",
  "published": true,
  "createdAt": "2026-06-16T00:38:46.936Z",
  "updatedAt": "2026-06-16T00:38:46.936Z",
  "photos": [
    {
      "id": "clx...",
      "key": "seed/district1-night-1.jpg",
      "alt": null,
      "caption": null,
      "postId": "clx...",
      "position": 0,
      "exifData": null,
      "createdAt": "2026-06-16T00:38:46.936Z",
      "updatedAt": "2026-06-16T00:38:46.936Z",
      "url": "https://picsum.photos/seed/clx.../800/600" // GENERATED, not stored — placeholder until Week 5 S3
    }
  ],
  "author": {
    "id": "clx...",
    "username": "quan",
    "name": "Quan Nguyen",
    "profilePictureUrl": null,
    "bio": "I'm a photographer and developer."
    // exclude email and password from the response
  },
  "tags": [
    "street"
  ]
}
```

### List envelope

<!-- The wrapper for GET /posts and GET /users/:username/posts. -->

```jsonc
{
  "data": [...], // Post[] - see above
  "total": 3,
  "page": 1,
  "limit": 10
}
```

### Error envelope

<!-- One table: each error CAUSE → status → body. Pull the branches from
     errorHandler.ts (ZodError vs HttpError vs fallthrough) plus per-route 404s. -->
     
 <!-- {"error":"Schema validation failed","details":[{"field":"title","message":"Invalid input: expected string, received undefined"}]} -->

| Cause | Status | Body |
| ----- | ------ | ---- |
|       |        |      |

## Post reads

### `GET /posts`

<!-- template: see formula above -->

### `GET /posts/mine`

### `GET /posts/:slug`

### `GET /users/:username/posts`

## Post writes

### `POST /posts`

### `PATCH /posts/:id`

### `DELETE /posts/:id`

## Nested photo writes (stubs)

<!-- All three are stubs until Week 5. One line each on the stub response. -->

### `POST /posts/:id/photos`

### `PATCH /posts/:id/photos/:photoId`

### `DELETE /posts/:id/photos/:photoId`
