import { Router, Request, Response } from 'express'
import sql from '../db/database'
import { streamToResponse } from '../services/llm'
import { resolveKeyForModel } from '../services/credentials'
import { compilePrompt } from '../services/promptBuilder'
import { Prompt, Variable } from '../types'

const router = Router({ mergeParams: true })

router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const [prompt] = await sql<Prompt[]>`
    SELECT * FROM prompts WHERE id = ${id} AND user_id = ${req.userId!}
  `
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const resolved = await resolveKeyForModel(req.userId!, prompt.model)
  if (!resolved.ok) return res.status(resolved.status).json(resolved.body)

  const variables = await sql<Variable[]>`SELECT * FROM variables WHERE prompt_id = ${id}`

  const variableValues: Record<string, string> = {}
  for (const v of variables) {
    variableValues[v.name] = v.default_value
  }

  const activePrompt =
    prompt.active_version === 'rewritten' && prompt.rewritten_prompt
      ? prompt.rewritten_prompt
      : prompt.raw_prompt

  const compiled = compilePrompt(activePrompt, variableValues)

  await streamToResponse(
    resolved.key,
    [{ role: 'user', content: compiled }],
    prompt.model,
    res
  )
})

export default router
