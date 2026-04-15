import { Router, Request, Response } from 'express'
import db from '../db/database'
import { callJSON } from '../services/openai'
import { getAllTags, buildTagListForPrompt } from '../services/tagService'
import { Prompt } from '../types'

const router = Router({ mergeParams: true })

router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Prompt | undefined
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const tags = getAllTags()
  const tagList = buildTagListForPrompt(tags)

  const systemPrompt = `You are a prompt engineering expert. Your job is to analyze the given LLM prompt template and suggest which of the following enhancement tags would most meaningfully improve it.

Available tags:
${tagList}

Rules:
- Treat {{variable}} placeholders as dynamic inputs; do not analyze their values.
- Suggest only tags that would genuinely improve the prompt's quality or clarity.
- Return ONLY valid JSON, no explanation.

Response format:
{"suggested_tag_ids": [1, 3, 5]}`

  try {
    const result = await callJSON<{ suggested_tag_ids: number[] }>(
      systemPrompt,
      `Prompt to analyze:\n"""\n${prompt.raw_prompt}\n"""`,
      'gpt-4o'
    )
    res.json(result)
  } catch (err) {
    console.error('Analyze error:', err)
    res.status(500).json({ error: 'LLM call failed' })
  }
})

export default router
