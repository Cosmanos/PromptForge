import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
import { DefaultTag, DefaultTagWithCounters } from '../types'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// All routes here are admin-only. Edits to default_tags do NOT propagate to
// existing users' tags — the template is read only at provisioning time.
router.use(requireAdmin)

const DefaultTagInput = z.object({
  name: z.string().min(1).max(100),
  hint: z.string().max(2000),
  rewrite_instructions: z.string().max(4000),
  sort_order: z.number().int().optional(),
  counter_tag_ids: z.array(z.number().int()).optional(),
})

const UNIQUE_VIOLATION = '23505'

function withCounters(tag: DefaultTag, counterIds: number[]): DefaultTagWithCounters {
  return { ...tag, id: Number(tag.id), counter_tag_ids: counterIds }
}

async function counterIdsFor(tagId: number): Promise<number[]> {
  const rows = await sql<{ cid: string }[]>`
    SELECT CASE WHEN tag_id = ${tagId} THEN counter_tag_id ELSE tag_id END AS cid
    FROM default_tag_counter_tags
    WHERE tag_id = ${tagId} OR counter_tag_id = ${tagId}
  `
  return rows.map((r) => Number(r.cid))
}

async function replaceCounters(tagId: number, counterIds: number[]): Promise<void> {
  const ids = [...new Set(counterIds)].filter((cid) => cid !== tagId)
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM default_tag_counter_tags WHERE tag_id = ${tagId} OR counter_tag_id = ${tagId}
    `
    if (ids.length > 0) {
      const rows = ids.map((cid) => ({
        tag_id: Math.min(tagId, cid),
        counter_tag_id: Math.max(tagId, cid),
      }))
      await tx`INSERT INTO default_tag_counter_tags ${tx(rows, 'tag_id', 'counter_tag_id')}`
    }
  })
}

async function allExist(ids: number[]): Promise<boolean> {
  if (ids.length === 0) return true
  const unique = [...new Set(ids)]
  const found = await sql<{ id: number }[]>`
    SELECT id FROM default_tags WHERE id = ANY(${unique})
  `
  return found.length === unique.length
}

router.get('/', async (_req: Request, res: Response) => {
  const tags = await sql<DefaultTag[]>`SELECT * FROM default_tags ORDER BY sort_order, id`
  const pairs = await sql<{ tag_id: string; counter_tag_id: string }[]>`
    SELECT tag_id, counter_tag_id FROM default_tag_counter_tags
  `
  const map = new Map<number, number[]>()
  for (const p of pairs) {
    const a = Number(p.tag_id)
    const b = Number(p.counter_tag_id)
    map.set(a, [...(map.get(a) ?? []), b])
    map.set(b, [...(map.get(b) ?? []), a])
  }
  res.json(tags.map((t) => withCounters(t, map.get(Number(t.id)) ?? [])))
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = DefaultTagInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { name, hint, rewrite_instructions, sort_order = 0, counter_tag_ids = [] } = parsed.data
  if (!(await allExist(counter_tag_ids))) {
    return res.status(400).json({ error: 'One or more counter-tags are invalid' })
  }
  try {
    const [tag] = await sql<DefaultTag[]>`
      INSERT INTO default_tags (name, hint, rewrite_instructions, sort_order)
      VALUES (${name}, ${hint}, ${rewrite_instructions}, ${sort_order})
      RETURNING *
    `
    await replaceCounters(Number(tag.id), counter_tag_ids)
    res.status(201).json(withCounters(tag, await counterIdsFor(Number(tag.id))))
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
  if (parsed.data.rewrite_instructions !== undefined) {
    updateObj.rewrite_instructions = parsed.data.rewrite_instructions
  }
  if (parsed.data.sort_order !== undefined) updateObj.sort_order = parsed.data.sort_order
  const counterIds = parsed.data.counter_tag_ids
  if (Object.keys(updateObj).length === 0 && counterIds === undefined) {
    return res.status(400).json({ error: 'No fields to update' })
  }
  if (counterIds !== undefined && !(await allExist(counterIds))) {
    return res.status(400).json({ error: 'One or more counter-tags are invalid' })
  }

  try {
    let tag: DefaultTag | undefined
    if (Object.keys(updateObj).length > 0) {
      const cols = Object.keys(updateObj)
      const updated = await sql<DefaultTag[]>`
        UPDATE default_tags SET ${sql(updateObj, ...cols)} WHERE id = ${id} RETURNING *
      `
      tag = updated[0]
    } else {
      const [existing] = await sql<DefaultTag[]>`SELECT * FROM default_tags WHERE id = ${id}`
      tag = existing
    }
    if (!tag) return res.status(404).json({ error: 'Default tag not found' })

    if (counterIds !== undefined) await replaceCounters(id, counterIds)
    res.json(withCounters(tag, await counterIdsFor(id)))
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
