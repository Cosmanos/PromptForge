import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
import { Tag } from '../types'
import { ensureUserProvisioned } from '../services/provisioning'

const router = Router()

const TagInput = z.object({
  name: z.string().min(1).max(100),
  hint: z.string().max(2000),
  sort_order: z.number().int().optional(),
})

// Postgres unique_violation
const UNIQUE_VIOLATION = '23505'

// GET /api/tags — the caller's own tags (provisioning on first contact)
router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!
  await ensureUserProvisioned(userId)
  const tags = await sql<Tag[]>`
    SELECT * FROM tags WHERE user_id = ${userId} ORDER BY sort_order, id
  `
  res.json(tags)
})

// POST /api/tags — create a new tag owned by the caller
router.post('/', async (req: Request, res: Response) => {
  const parsed = TagInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const userId = req.userId!
  const { name, hint, sort_order = 0 } = parsed.data
  try {
    const [tag] = await sql<Tag[]>`
      INSERT INTO tags (user_id, name, hint, sort_order)
      VALUES (${userId}, ${name}, ${hint}, ${sort_order})
      RETURNING *
    `
    res.status(201).json(tag)
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'You already have a tag with that name' })
    }
    throw err
  }
})

// PATCH /api/tags/:id — update one of the caller's tags
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const userId = req.userId!

  const parsed = TagInput.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const updateObj: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateObj.name = parsed.data.name
  if (parsed.data.hint !== undefined) updateObj.hint = parsed.data.hint
  if (parsed.data.sort_order !== undefined) updateObj.sort_order = parsed.data.sort_order
  if (Object.keys(updateObj).length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  try {
    const cols = Object.keys(updateObj)
    const updated = await sql<Tag[]>`
      UPDATE tags SET ${sql(updateObj, ...cols)}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `
    if (updated.length === 0) return res.status(404).json({ error: 'Tag not found' })
    res.json(updated[0])
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'You already have a tag with that name' })
    }
    throw err
  }
})

// DELETE /api/tags/:id — delete one of the caller's tags (warning is a UI concern)
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const userId = req.userId!
  const deleted = await sql`
    DELETE FROM tags WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `
  if (deleted.length === 0) return res.status(404).json({ error: 'Tag not found' })
  res.status(204).send()
})

export default router
