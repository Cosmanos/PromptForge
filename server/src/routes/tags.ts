import { Router } from 'express'
import db from '../db/database'
import { Tag } from '../types'

const router = Router()

router.get('/', (_req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY sort_order').all() as Tag[]
  res.json(tags)
})

export default router
