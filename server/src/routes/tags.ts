import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
import { Tag, TagWithCounters } from '../types'
import { ensureUserProvisioned } from '../services/provisioning'
import { getCounterMap } from '../services/tagService'

const router = Router()

const TagInput = z.object({
  name: z.string().min(1).max(100),
  hint: z.string().max(2000),
  rewrite_instructions: z.string().max(4000),
  sort_order: z.number().int().optional(),
  counter_tag_ids: z.array(z.number().int()).optional(),
})

// Postgres unique_violation
const UNIQUE_VIOLATION = '23505'

function withCounters(tag: Tag, counterIds: number[]): TagWithCounters {
  return { ...tag, id: Number(tag.id), counter_tag_ids: counterIds }
}

async function counterIdsFor(tagId: number): Promise<number[]> {
  const rows = await sql<{ cid: string }[]>`
    SELECT CASE WHEN tag_id = ${tagId} THEN counter_tag_id ELSE tag_id END AS cid
    FROM tag_counter_tags
    WHERE tag_id = ${tagId} OR counter_tag_id = ${tagId}
  `
  return rows.map((r) => Number(r.cid))
}

// Replace the counter set for one tag: drop every pair touching it, insert the
// new set in canonical (lower id first) order. Self-references are dropped.
async function replaceCounters(tagId: number, counterIds: number[]): Promise<void> {
  const ids = [...new Set(counterIds)].filter((cid) => cid !== tagId)
  await sql.begin(async (tx) => {
    await tx`DELETE FROM tag_counter_tags WHERE tag_id = ${tagId} OR counter_tag_id = ${tagId}`
    if (ids.length > 0) {
      const rows = ids.map((cid) => ({
        tag_id: Math.min(tagId, cid),
        counter_tag_id: Math.max(tagId, cid),
      }))
      await tx`INSERT INTO tag_counter_tags ${tx(rows, 'tag_id', 'counter_tag_id')}`
    }
  })
}

// Every counter id must be one of the caller's own tags.
async function ownsAllTags(userId: string, ids: number[]): Promise<boolean> {
  if (ids.length === 0) return true
  const unique = [...new Set(ids)]
  const owned = await sql<{ id: number }[]>`
    SELECT id FROM tags WHERE id = ANY(${unique}) AND user_id = ${userId}
  `
  return owned.length === unique.length
}

// GET /api/tags — the caller's own tags (provisioning on first contact)
router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!
  await ensureUserProvisioned(userId)
  const tags = await sql<Tag[]>`
    SELECT * FROM tags WHERE user_id = ${userId} ORDER BY sort_order, id
  `
  const counters = await getCounterMap(userId)
  res.json(tags.map((t) => withCounters(t, counters.get(Number(t.id)) ?? [])))
})

// POST /api/tags — create a new tag owned by the caller
router.post('/', async (req: Request, res: Response) => {
  const parsed = TagInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const userId = req.userId!
  const { name, hint, rewrite_instructions, sort_order = 0, counter_tag_ids = [] } = parsed.data
  if (!(await ownsAllTags(userId, counter_tag_ids))) {
    return res.status(400).json({ error: 'One or more counter-tags are invalid' })
  }
  try {
    const [tag] = await sql<Tag[]>`
      INSERT INTO tags (user_id, name, hint, rewrite_instructions, sort_order)
      VALUES (${userId}, ${name}, ${hint}, ${rewrite_instructions}, ${sort_order})
      RETURNING *
    `
    await replaceCounters(Number(tag.id), counter_tag_ids)
    res.status(201).json(withCounters(tag, await counterIdsFor(Number(tag.id))))
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
  if (parsed.data.rewrite_instructions !== undefined) {
    updateObj.rewrite_instructions = parsed.data.rewrite_instructions
  }
  if (parsed.data.sort_order !== undefined) updateObj.sort_order = parsed.data.sort_order
  const counterIds = parsed.data.counter_tag_ids
  if (Object.keys(updateObj).length === 0 && counterIds === undefined) {
    return res.status(400).json({ error: 'No fields to update' })
  }
  if (counterIds !== undefined && !(await ownsAllTags(userId, counterIds))) {
    return res.status(400).json({ error: 'One or more counter-tags are invalid' })
  }

  try {
    let tag: Tag | undefined
    if (Object.keys(updateObj).length > 0) {
      const cols = Object.keys(updateObj)
      const updated = await sql<Tag[]>`
        UPDATE tags SET ${sql(updateObj, ...cols)}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `
      tag = updated[0]
    } else {
      // Counter-only PATCH: ownership gate before touching the join table.
      const [existing] = await sql<Tag[]>`
        SELECT * FROM tags WHERE id = ${id} AND user_id = ${userId}
      `
      tag = existing
    }
    if (!tag) return res.status(404).json({ error: 'Tag not found' })

    if (counterIds !== undefined) await replaceCounters(id, counterIds)
    res.json(withCounters(tag, await counterIdsFor(id)))
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'You already have a tag with that name' })
    }
    throw err
  }
})

// DELETE /api/tags/:id — delete one of the caller's tags (warning is a UI
// concern). Counter pairs and prompt_tags rows cascade away.
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
