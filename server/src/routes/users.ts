import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { prisma } from '../lib/prisma'
import { serializePost } from '../lib/serializers'

// Mounted at /users in app.ts.
const router = Router()

// GET /users/:username/posts → a single user's published posts (portfolio feed)
router.get(
  '/:username/posts',
  asyncHandler(async (req, res) => {
    const username = req.params.username

    const author = await prisma.user.findUnique({ where: { username } })

    if (!author) {
      return res.status(404).json({ error: 'user not found' })
    }

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const postFilter = { authorId: author.id, published: true }
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: postFilter,
        orderBy: { createdAt: 'desc' },
        include: {
          photos: { orderBy: { position: 'asc' } },
          author: true,
          tags: true
        }
      }),
      prisma.post.count({
        where: postFilter
      })
    ])

    return res.json({ data: posts.map(serializePost), total, page, limit })
  })
)

export default router
