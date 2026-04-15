import { Router, Request, Response } from 'express'
import db from '../db/database'
import { streamToResponse } from '../services/openai'
import { compilePrompt } from '../services/promptBuilder'
import { Prompt, Variable } from '../types'

const router = Router({ mergeParams: true })

router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Prompt | undefined
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const variables = db
    .prepare('SELECT * FROM variables WHERE prompt_id = ?')
    .all(id) as Variable[]

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
    [{ role: 'user', content: compiled }],
    prompt.model,
    res
  )
})

export default router
