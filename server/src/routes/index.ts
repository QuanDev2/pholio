import postsRouter from './posts'
import usersRouter from './users'
import { Router } from 'express'

const api = Router()
api.use('/posts', postsRouter)
api.use('/users', usersRouter)

export default api
