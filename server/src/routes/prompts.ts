import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../db/database'
import { Prompt, Variable, PromptWithDetails } from '../types'

const router = Router()

// ---- Schemas ----

const CreatePromptSchema = z.object({
  name: z.string().optional(),
  model: z.string().optional(),
})

const UpdatePromptSchema = z.object({
  name: z.string().optional(),
  raw_prompt: z.string().optional(),
  rewritten_prompt: z.string().nullable().optional(),
  active_version: z.enum(['original', 'rewritten']).optional(),
  model: z.string().optional(),
  variables: z
    .array(
      z.object({
        name: z.string(),
        default_value: z.string(),
        color: z.string(),
        sort_order: z.number(),
      })
    )
    .optional(),
  tag_ids: z.array(z.number()).optional(),
})

// ---- Helpers ----

function getPromptWithDetails(id: number): PromptWithDetails | undefined {
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Prompt | undefined
  if (!prompt) return undefined

  const variables = db
    .prepare('SELECT * FROM variables WHERE prompt_id = ? ORDER BY sort_order')
    .all(id) as Variable[]

  const tagRows = db
    .prepare('SELECT tag_id FROM prompt_tags WHERE prompt_id = ?')
    .all(id) as { tag_id: number }[]

  return {
    ...prompt,
    variables,
    tag_ids: tagRows.map((r) => r.tag_id),
  }
}

// ---- Routes ----

// GET /api/prompts — list all prompts
router.get('/', (_req, res) => {
  const prompts = db
    .prepare(
      `SELECT p.*, COUNT(v.id) as variable_count
       FROM prompts p
       LEFT JOIN variables v ON v.prompt_id = p.id
       GROUP BY p.id
       ORDER BY p.updated_at DESC`
    )
    .all()
  res.json(prompts)
})

// GET /api/prompts/:id — full prompt with variables + tags
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const prompt = getPromptWithDetails(id)
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })
  res.json(prompt)
})

// POST /api/prompts — create new prompt
router.post('/', (req: Request, res: Response) => {
  const parsed = CreatePromptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = db
    .prepare(
      `INSERT INTO prompts (name, model)
       VALUES (@name, @model)`
    )
    .run({
      name: parsed.data.name ?? 'Untitled Prompt',
      model: parsed.data.model ?? 'gpt-4o',
    })

  const prompt = getPromptWithDetails(result.lastInsertRowid as number)
  res.status(201).json(prompt)
})

// PATCH /api/prompts/:id — update (auto-save)
router.patch('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT id FROM prompts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Prompt not found' })

  const parsed = UpdatePromptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const data = parsed.data

  const updates: string[] = ['updated_at = datetime(\'now\')']
  const params: Record<string, unknown> = { id }

  if (data.name !== undefined) { updates.push('name = @name'); params.name = data.name }
  if (data.raw_prompt !== undefined) { updates.push('raw_prompt = @raw_prompt'); params.raw_prompt = data.raw_prompt }
  if (data.rewritten_prompt !== undefined) { updates.push('rewritten_prompt = @rewritten_prompt'); params.rewritten_prompt = data.rewritten_prompt }
  if (data.active_version !== undefined) { updates.push('active_version = @active_version'); params.active_version = data.active_version }
  if (data.model !== undefined) { updates.push('model = @model'); params.model = data.model }

  if (updates.length > 1) {
    db.prepare(`UPDATE prompts SET ${updates.join(', ')} WHERE id = @id`).run(params)
  }

  // Replace variables if provided
  if (data.variables !== undefined) {
    db.prepare('DELETE FROM variables WHERE prompt_id = ?').run(id)
    const insertVar = db.prepare(
      `INSERT INTO variables (prompt_id, name, default_value, color, sort_order)
       VALUES (@prompt_id, @name, @default_value, @color, @sort_order)`
    )
    const insertAll = db.transaction((vars: NonNullable<typeof data.variables>) => {
      for (const v of vars) {
        insertVar.run({ prompt_id: id, ...v })
      }
    })
    insertAll(data.variables)
  }

  // Replace tags if provided
  if (data.tag_ids !== undefined) {
    db.prepare('DELETE FROM prompt_tags WHERE prompt_id = ?').run(id)
    const insertTag = db.prepare(
      'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (@prompt_id, @tag_id)'
    )
    const insertAllTags = db.transaction((tagIds: number[]) => {
      for (const tag_id of tagIds) {
        insertTag.run({ prompt_id: id, tag_id })
      }
    })
    insertAllTags(data.tag_ids)
  }

  res.json(getPromptWithDetails(id))
})

// DELETE /api/prompts/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT id FROM prompts WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Prompt not found' })

  db.prepare('DELETE FROM prompts WHERE id = ?').run(id)
  res.status(204).send()
})

export default router
