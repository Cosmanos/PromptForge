import { Router } from 'express'
import sql from '../db/database'
import { Tag } from '../types'

const router = Router()

router.get('/', async (_req, res) => {
  const tags = await sql<Tag[]>`SELECT * FROM tags ORDER BY sort_order`
  res.json(tags)
})

export default router
