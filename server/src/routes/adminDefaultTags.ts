import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
import { DefaultTag } from '../types'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// All routes here are admin-only. Edits to default_tags do NOT propagate to
// existing users' tags — the template is read only at provisioning time.
router.use(requireAdmin)

const DefaultTagInput = z.object({
  name: z.string().min(1).max(100),
  hint: z.string().max(2000),
  sort_order: z.number().int().optional(),
})

const UNIQUE_VIOLATION = '23505'

router.get('/', async (_req: Request, res: Response) => {
  const tags = await sql<DefaultTag[]>`SELECT * FROM default_tags ORDER BY sort_order, id`
  res.json(tags)
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = DefaultTagInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { name, hint, sort_order = 0 } = parsed.data
  try {
    const [tag] = await sql<DefaultTag[]>`
      INSERT INTO default_tags (name, hint, sort_order)
      VALUES (${name}, ${hint}, ${sort_order})
      RETURNING *
    `
    res.status(201).json(tag)
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A default tag with that name already exists' })
    }
    throw err
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const parsed = DefaultTagInput.partial().safeParse(req.body)
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
    const updated = await sql<DefaultTag[]>`
      UPDATE default_tags SET ${sql(updateObj, ...cols)} WHERE id = ${id} RETURNING *
    `
    if (updated.length === 0) return res.status(404).json({ error: 'Default tag not found' })
    res.json(updated[0])
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A default tag with that name already exists' })
    }
    throw err
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const deleted = await sql`DELETE FROM default_tags WHERE id = ${id} RETURNING id`
  if (deleted.length === 0) return res.status(404).json({ error: 'Default tag not found' })
  res.status(204).send()
})

export default router
