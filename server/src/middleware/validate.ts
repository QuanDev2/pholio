import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) // throws ZodError if invalid
    next()
  }
