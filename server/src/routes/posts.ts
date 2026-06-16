import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { prisma } from '../lib/prisma'

// Mounted at /posts in app.ts — paths here are RELATIVE to that prefix.
const router = Router()

// --- Post reads (public) ---

// GET /posts → the /explore world feed (published posts of all users)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // console.log(req.query)
    // { page: '1', limit: '12' }
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          photos: { orderBy: { position: 'asc' } },
          author: true,
          tags: true
        }
      }),
      prisma.post.count()
    ])

    const processedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags.map((tag) => tag.name)
    }))

    return res.json({ data: processedPosts, total, page, limit })
  })
)

// GET /posts/mine → caller's own posts incl. drafts.
// MUST be registered before '/:slug', else 'mine' matches the :slug param.
// Stubbed public for now; locked to the authenticated author in Week 4 Day 3.
router.get(
  '/mine',
  asyncHandler(async (_req, res) => {
    res.json({ data: [], message: 'my posts stub (auth lands Week 4)' })
  })
)

// GET /posts/:slug → single post with photos + tags + author
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.json({ message: 'single post stub', slug: req.params.slug })
  })
)

// --- Post writes ---

router.post(
  '/',
  asyncHandler(async (_req, res) => {
    res.status(201).json({ message: 'create post stub' })
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ message: 'update post stub', id: req.params.id })
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ message: 'delete post stub', id: req.params.id })
  })
)

// --- Nested photo writes (real S3-backed logic in Week 5) ---
// A photo is always addressed through its parent post: Photo.postId is required.

router.post(
  '/:id/photos',
  asyncHandler(async (req, res) => {
    res.status(201).json({ message: 'add photo stub', postId: req.params.id })
  })
)

router.patch(
  '/:id/photos/:photoId',
  asyncHandler(async (req, res) => {
    res.json({
      message: 'update photo stub',
      postId: req.params.id,
      photoId: req.params.photoId
    })
  })
)

router.delete(
  '/:id/photos/:photoId',
  asyncHandler(async (req, res) => {
    res.json({
      message: 'delete photo stub',
      postId: req.params.id,
      photoId: req.params.photoId
    })
  })
)

export default router
