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
| DELETE | `/posts/:id`                 | (Week 4) | write-heavy                    | cascade-deletes photos; invalidates post + feeds              |
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
            "type": "text",
          },
        ],
      }, // Tiptap rich-text JSON
    ],
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
      "url": "https://picsum.photos/seed/clx.../800/600", // GENERATED, not stored — placeholder until Week 5 S3
    },
  ],
  "author": {
    "id": "clx...",
    "username": "quan",
    "name": "Quan Nguyen",
    "profilePictureUrl": null,
    "bio": "I'm a photographer and developer.",
    // exclude email and password from the response
  },
  "tags": ["street"],
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

| Cause                                                     | Status | Body                                 |
| --------------------------------------------------------- | ------ | ------------------------------------ |
| Request body fails Zod validation (missing/invalid field) | 400    | see _Validation error (400)_ below   |
| Unknown tag                                               | 400    | `{"error":"unknown tag"}`            |
| Resource not found                                        | 404    | `{"error":"{Resource} not found"}`   |
| Unexpected/uncaught                                       | 500    | `{"error": "Internal Server Error"}` |

**Validation error (400):**

```json
{
  "error": "Schema validation failed",
  "details": [{ "field": "title", "message": "Invalid input: expected string, received undefined" }]
}
```

## Post reads

### `GET /posts`

Retrieve all the published posts for the world feed

- **Auth:** public
- **Query params:** `page` (default 1), `limit` (default 10)
- **2xx:** 200, list envelope of `Post[]`
- **4xx:** none

### `GET /posts/mine`

Retrieve all the posts for the logged in user

- **Auth:** public stub today → authenticated (Week 4 Day 3, filtered by req.user.id)
- **Query params:** `page` (default 1), `limit` (default 10)
- **2xx:** 200 — currently a stub (`{ data: [], message }`); becomes a list envelope of Post[] (incl. drafts) in Week 4
- **4xx:** none today; 401 (unauthenticated) once auth lands (Week 4)

### `GET /posts/:slug`

Retrieve a single post by its slug, with photos (position-ordered), author, and tags.

- **Auth:** public
- **Path params:** `slug` — the post's URL slug
- **2xx:** 200, `{ data: Post }`
- **4xx:** 404 — see _Resource not found_

### `GET /users/:username/posts`

Retrieve one user's published posts — the portfolio feed.

- **Auth:** public
- **Path params:** `username` — the portfolio owner
- **Query params:** `page` (default 1), `limit` (default 10)
- **2xx:** 200, list envelope of `Post[]` (that author, published only)
- **4xx:** 404 — see _Resource not found_ (no such username)

## Post writes

### `POST /posts`

Create a draft post (`published: false`). Slug is auto-generated (`slugify(title) + "-" + nanoid(6)`); `content` is seeded as an empty Tiptap doc; photos attach later (Week 5).

- **Auth:** public stub today → authenticated (Week 4)
- **Request body:** `createPostSchema`
  - `title` — string, 1–200 chars, required
  - `authorId` — string, required (becomes `req.user.id` in Week 4)
  - `tags` — `string[]` of tag IDs, optional (defaults to `[]`)
- **2xx:** 201, `{ data: Post }`
- **4xx:** 400 (Zod) — see _Validation error_; 400 — see _Unknown tag_ row

### `PATCH /posts/:id`

Update a post. All fields optional; omitting `tags` leaves the existing set untouched, while passing `tags` **replaces** it.

- **Auth:** public stub today → authenticated + ownership check (Week 4 Day 6)
- **Path params:** `id` — the post's id
- **Request body:** `updatePostSchema` (all optional)
  - `title` — string, 1–200 chars
  - `content` — Tiptap rich-text JSON
  - `published` — boolean
  - `tags` — `string[]` of tag IDs (replaces the set)
- **2xx:** 200, `{ data: Post }`
- **4xx:** 400 (Zod) — see _Validation error_; 400 — see _Unknown tag_ row; 404 — see _Resource not found_

### `DELETE /posts/:id`

Delete a post. Its photos cascade-delete at the DB level (S3 cleanup is Week 5).

- **Auth:** public stub today → authenticated + ownership check (Week 4 Day 6)
- **Path params:** `id` — the post's id
- **2xx:** 204, empty body
- **4xx:** 404 — see _Resource not found_

## Nested photo writes (stubs)

A photo is always addressed through its parent post (`Photo.postId` is required). Real S3-backed logic lands in Week 5; ownership (via the parent post's `authorId`) is enforced in Week 4 Day 6.

### `POST /posts/:id/photos`

- **Auth:** (Week 4) → authenticated + ownership
- **Path params:** `id` — parent post id
- **2xx (stub):** 201, `{ "message": "add photo stub", "postId": "<id>" }`

### `PATCH /posts/:id/photos/:photoId`

- **Auth:** (Week 4) → authenticated + ownership
- **Path params:** `id` — parent post id; `photoId` — the photo
- **2xx (stub):** 200, `{ "message": "update photo stub", "postId": "<id>", "photoId": "<photoId>" }`

### `DELETE /posts/:id/photos/:photoId`

- **Auth:** (Week 4) → authenticated + ownership
- **Path params:** `id` — parent post id; `photoId` — the photo
- **2xx (stub):** 200, `{ "message": "delete photo stub", "postId": "<id>", "photoId": "<photoId>" }`
