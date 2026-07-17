# Feature: LLM Search (RAG "AI Summary") over Posts

The **lead AI feature**. On `/explore`, next to the normal text search, an **AI Summary**
button. Ask *"food in Saigon"* and get a grounded, **inline-cited** prose summary of what
users actually posted, with photos and links back to the source posts.

This is true **RAG** (retrieve → generate → cite), not just semantic reranking: it embeds
the query, retrieves the most relevant published posts, then an LLM writes a summary
grounded **only** in those posts, with citations.

> **Architecture note (read first).** The AI compute lives in **beef-broth**
> (`~/projects/apps/beef-broth`), Pholio's Python/FastAPI AI service — not in this Node
> backend. Pholio **triggers** beef-broth over HTTP and **renders** the result. beef-broth
> owns embeddings, retrieval, and generation. Full AI design: beef-broth's
> `design/overview.md`. This doc is the **Pholio-side** spec.

---

## Who does what

| Step | Owner |
|---|---|
| Publish/edit/delete events, enqueue ingest jobs | **Pholio** (Express + BullMQ) |
| Embed post text, store vectors, retrieve top-k, generate the cited summary | **beef-broth** (Python) |
| The vector table (in the **shared** Postgres) | **beef-broth owns it** |
| `Post` / `Photo` tables | **Pholio owns them**; beef-broth gets content by HTTP payload |
| The `/explore` UI (two buttons, the answer card) | **Pholio** (React) |

**Boundary:** beef-broth never reads Pholio's `Post`/`Photo` tables. Pholio sends post
content in the request body. beef-broth reads/writes only its own vector table.

---

## Providers (locked 2026-07-15)

- **Embeddings:** Voyage AI, `voyage-3.5` → **`vector(1024)`**. (Anthropic has no
  first-party embedding API; Voyage is their recommended partner.)
- **Generation (the summary):** Claude.
- Same embedding model for index **and** query — mixing models/dims breaks similarity.

---

## Schema — beef-broth's vector table (shared Postgres)

beef-broth owns a table keyed by Pholio's post id. Pholio does **not** add an embedding
column to `Post` (keeps the service boundary clean).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Owned by beef-broth; lives in the shared DB.
CREATE TABLE post_embedding (
  post_id    text PRIMARY KEY,          -- references Pholio's Post.id (by value, no FK across owners)
  embedding  vector(1024) NOT NULL,     -- Voyage voyage-3.5
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON post_embedding USING ivfflat (embedding vector_cosine_ops);
```

---

## The text that gets embedded

Embed the **whole bundle**, not just the body — photographers write thin bodies; title,
tags, and photo captions carry the signal.

```
embedInput = `${title}\n\nTags: ${tags.join(", ")}\n\n${plainTextBody}\n\n${photoCaptions.join("\n")}`
```

- `body` is Tiptap JSON → flatten to plain text first (walk the doc, concat text nodes;
  reuse the same `generateText` helper the feed uses).
- `photoCaptions` are the **AI vision captions** (see "Vision captions" below). Include
  them so a great photo with a lazy human caption is still findable.

Pholio builds this bundle and sends it to beef-broth's `/ingest`; beef-broth embeds + stores.

---

## Ingest lifecycle (keep the index in sync)

The vector table is a *separate copy* of each post's meaning. It must be synced or the
summary cites stale/deleted content. All three events are in v1:

| Event | Pholio action | beef-broth action |
|---|---|---|
| **Publish** | enqueue ingest job → `POST /ingest {postId, bundle}` | embed → upsert row |
| **Edit** a published post | enqueue ingest job (re-send bundle) | re-embed → update row |
| **Unpublish / delete** | `POST /ingest` delete (or a `DELETE`) with `{postId}` | remove row |

Run these **async on BullMQ**, never inline on the publish request. Backfill once: a
script loops existing published posts and posts each bundle to `/ingest`.

Only **published** posts are ever indexed. Drafts/unpublished are never sent.

---

## Search + summary (the RAG request)

The AI Summary button is **opt-in** (a click), so the paid LLM call only fires on demand.
It's a **sync** call — the user waits with a spinner (~2-5s).

```
user clicks "AI Summary" on /explore (with active filters)
  → Pholio: POST /search { query, filters }   (sync HTTP to beef-broth)
      beef-broth:
        1. embed(query)                                    // Voyage
        2. retrieve top-k from post_embedding (cosine <=>) // pure semantic, v1
        3. Pholio-supplied filter set scopes candidate postIds
        4. Claude summarizes ONLY the retrieved posts, grounded, with inline [n] markers
      → returns { summary, citations: [{n, postId}], sourcePostIds }
  → Pholio: render the answer card (prose + inline [n] links + photo thumbnails + source links)
```

- **Retrieval:** **pure semantic** for v1 (embed query → cosine top-k). Hybrid
  (semantic + keyword) is a later upgrade if recall disappoints.
- **Respect active `/explore` filters:** if the user has a tag/search filter set, the
  summary draws **only** from that filtered subset. Pholio passes the allowed post ids (or
  the filter predicate) so beef-broth restricts retrieval.
- **Grounding + citations:** the summary uses only retrieved content; each claim carries an
  inline marker `[n]` mapping to a source post. This is the core "responsible AI" story.

---

## UI (`/explore`)

- **Two buttons:** **Text Search** (existing keyword/full-text, unchanged) and **AI Summary** (RAG).
- **Answer card:** a prose summary (a paragraph or two) with inline `[n]` citation links, a
  row of photo thumbnails from the source posts, and links back to those posts.
- The normal filtered post grid stays; the card renders above/beside it.

---

## Vision captions (part of this pipeline, not a separate track)

Making **photo content** searchable is **caption-then-embed**, and it feeds the same index:

- At upload (after the S3 put), Pholio enqueues a caption job → beef-broth `POST /caption`
  → Claude vision writes a description → stored as `Photo.aiCaption`.
- Those captions go into the embed bundle above, so `sunset` finds a sunset photo even if
  the human caption was just "finally."
- One vision call per photo, once, async. Free side benefit: `aiCaption` doubles as alt-text.

> **No CLIP.** We deliberately do **not** do joint image-text (CLIP) embeddings. Caption-then-embed
> gives most of the value for a fraction of the work, keeps one vector space, and needs no
> local model. Being able to explain *why not CLIP* is itself a strong interview point.

---

## Gotchas
- **Empty query** → don't embed `""`; fall back to normal recency/keyword sort.
- **Dim mismatch** → `vector(1024)` must match Voyage's output dim. Pin the model.
- **Stale index** → this is why edit/delete ingest is in v1, not deferred.
- **Small corpus at demo time** → you seed the posts (~20-30). Retrieval is architecturally
  justified but not yet load-bearing; seed varied content and say so honestly.

---

## Roadmap placement

Integrates around **Week 8** (needs the editor, photo upload, and `/explore` feed first).
This is now the **primary AI feature**, not an optional off-critical-path extra. The old
"optional differentiator / Phase 2 CLIP" framing is retired (see beef-broth `archive/`).

**Resume bullet:** *"Built RAG search: Voyage embeddings + pgvector retrieval feeding a
grounded, inline-cited LLM summary; async ingest pipeline on BullMQ; caption-then-embed so
image content is searchable."*
