# pholio

A platform for photographers to host their photos and write about them.

Most photo platforms treat writing as an afterthought. Most writing platforms treat photos as decorations. pholio puts both on equal footing — photographers can build a library of their work, write long-form posts with photos embedded inline, and publish a clean public portfolio.
In other words: a portfolio with stories behind it.

**Live demo:** _coming soon_

---

## Features

- **Photo library** — upload photos with drag-and-drop, auto-parsed EXIF metadata (camera, lens, aperture, shutter speed, ISO), and automatic background processing into multiple sizes (thumbnail, medium, full) in WebP format
- **Post editor** — rich text editor with inline photo embedding from your library, draft autosave, and a clean publish flow
- **Public portfolio** — gallery and post views accessible without login; visitors can browse photos and read posts
- **Full-text search** — search across posts and photo descriptions
- **Infinite scroll** — cursor-based pagination on the gallery and post list
- **Auth** — JWT + refresh token authentication with httpOnly cookies

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- React Router v6
- TanStack Query (server state, infinite scroll, optimistic updates)
- Tailwind CSS + `@tailwindcss/typography`
- Tiptap (rich text editor with custom photo embed extension)
- Axios

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- Redis (rate limiting + job queue)
- BullMQ (background job queue)
- `sharp` (image resizing + WebP conversion)
- `exifr` (EXIF metadata parsing)
- `jsonwebtoken` + `bcrypt` (auth)
- Zod (request validation)

### Infrastructure
- AWS S3 / Cloudflare R2 (object storage)
- AWS CloudFront (CDN for image delivery)
- AWS EC2 (app server)
- AWS RDS (managed PostgreSQL)
- AWS ElastiCache (managed Redis)
- nginx (reverse proxy + SSL termination)
- Let's Encrypt (TLS certificate)
- Docker + docker-compose
- GitHub Actions (CI/CD)

---

## Architecture

```
Browser
  │
  ├── React frontend (Vercel or EC2)
  │     └── TanStack Query → Express API
  │
  └── Public assets → CloudFront CDN → S3
  
Express API (EC2)
  ├── PostgreSQL via Prisma (RDS)
  ├── Redis via ioredis (ElastiCache)
  │     ├── BullMQ job queue
  │     └── Rate limiting (sliding window)
  └── S3 presigned URLs (client uploads directly — never through the server)

BullMQ Worker (EC2)
  └── Consumes image-processing jobs
        ├── Fetch original from S3
        ├── Resize to 3 sizes + convert to WebP (sharp)
        └── Upload back to S3, update DB
```

**Key decisions:**
- **Presigned URLs** — clients upload directly to S3, the Express server never handles binary file data
- **Background worker** — image processing runs outside the request lifecycle so uploads are fast regardless of file size
- **Cursor pagination** — stable pagination that doesn't break when new rows are inserted, required for the infinite scroll gallery
- **Refresh token pattern** — short-lived access tokens (15 min) + long-lived refresh tokens in httpOnly cookies; resistant to XSS

---

## Local Setup

_Coming soon — setup instructions will be added once the initial scaffold is in place._

---

## Status

🚧 In active development — Week 1 of 12.
