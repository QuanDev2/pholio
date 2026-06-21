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
