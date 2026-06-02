import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
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

async function getPromptWithDetails(id: number): Promise<PromptWithDetails | undefined> {
  const [prompt] = await sql<Prompt[]>`SELECT * FROM prompts WHERE id = ${id}`
  if (!prompt) return undefined

  const variables = await sql<Variable[]>`
    SELECT * FROM variables WHERE prompt_id = ${id} ORDER BY sort_order
  `
  const tagRows = await sql<{ tag_id: number }[]>`
    SELECT tag_id FROM prompt_tags WHERE prompt_id = ${id}
  `

  return {
    ...prompt,
    variables: variables as Variable[],
    tag_ids: tagRows.map((r) => Number(r.tag_id)),
  }
}

// ---- Routes ----

// GET /api/prompts — list all prompts
router.get('/', async (_req, res) => {
  const prompts = await sql`
    SELECT p.*, COUNT(v.id) as variable_count
    FROM prompts p
    LEFT JOIN variables v ON v.prompt_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `
  res.json(prompts)
})

// GET /api/prompts/:id — full prompt with variables + tags
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const prompt = await getPromptWithDetails(id)
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })
  res.json(prompt)
})

// POST /api/prompts — create new prompt
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreatePromptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const name = parsed.data.name ?? 'Untitled Prompt'
  const model = parsed.data.model ?? 'gpt-4o'

  const [{ id }] = await sql<[{ id: number }]>`
    INSERT INTO prompts (name, model) VALUES (${name}, ${model}) RETURNING id
  `

  const prompt = await getPromptWithDetails(Number(id))
  res.status(201).json(prompt)
})

// PATCH /api/prompts/:id — update (auto-save)
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const [existing] = await sql`SELECT id FROM prompts WHERE id = ${id}`
  if (!existing) return res.status(404).json({ error: 'Prompt not found' })

  const parsed = UpdatePromptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const data = parsed.data

  const updateObj: Record<string, unknown> = {}
  if (data.name !== undefined) updateObj.name = data.name
  if (data.raw_prompt !== undefined) updateObj.raw_prompt = data.raw_prompt
  if (data.rewritten_prompt !== undefined) updateObj.rewritten_prompt = data.rewritten_prompt
  if (data.active_version !== undefined) updateObj.active_version = data.active_version
  if (data.model !== undefined) updateObj.model = data.model

  if (Object.keys(updateObj).length > 0) {
    updateObj.updated_at = new Date()
    const cols = Object.keys(updateObj)
    await sql`UPDATE prompts SET ${sql(updateObj, ...cols)} WHERE id = ${id}`
  }

  // Replace variables if provided
  if (data.variables !== undefined) {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM variables WHERE prompt_id = ${id}`
      if (data.variables!.length > 0) {
        const rows = data.variables!.map((v) => ({ prompt_id: id, ...v }))
        await tx`INSERT INTO variables ${tx(rows, 'prompt_id', 'name', 'default_value', 'color', 'sort_order')}`
      }
    })
  }

  // Replace tags if provided
  if (data.tag_ids !== undefined) {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM prompt_tags WHERE prompt_id = ${id}`
      if (data.tag_ids!.length > 0) {
        const rows = data.tag_ids!.map((tag_id) => ({ prompt_id: id, tag_id }))
        await tx`INSERT INTO prompt_tags ${tx(rows, 'prompt_id', 'tag_id')}`
      }
    })
  }

  res.json(await getPromptWithDetails(id))
})

// DELETE /api/prompts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const [existing] = await sql`SELECT id FROM prompts WHERE id = ${id}`
  if (!existing) return res.status(404).json({ error: 'Prompt not found' })

  await sql`DELETE FROM prompts WHERE id = ${id}`
  res.status(204).send()
})

export default router
