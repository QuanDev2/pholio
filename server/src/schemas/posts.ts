import { z } from 'zod'

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  authorId: z.string().min(1, 'authorId is required'),
  tags: z.array(z.string()).default([])
})

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional() // optional, NOT default([])
})
