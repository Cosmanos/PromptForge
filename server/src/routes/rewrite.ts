import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../db/database'
import { callJSON } from '../services/openai'
import { getTagsByIds, buildTagHintsForRewrite } from '../services/tagService'
import { Prompt } from '../types'

const router = Router({ mergeParams: true })

const RewriteSchema = z.object({
  tag_ids: z.array(z.number()).min(1),
})

router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Prompt | undefined
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const parsed = RewriteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const tags = getTagsByIds(parsed.data.tag_ids)
  if (tags.length === 0) return res.status(400).json({ error: 'No valid tags found' })

  const tagHints = buildTagHintsForRewrite(tags)

  const systemPrompt = `You are a prompt engineering expert. Rewrite the following LLM prompt template to naturally embed the selected enhancement behaviors listed below.

Rules:
- Do NOT add any meta-commentary, preamble, or system-context markers.
- The rewritten prompt must be self-contained — it should work in ANY LLM without assuming knowledge of these tags.
- Preserve all {{variable}} placeholders exactly as-is.
- Do not change the core intent or subject of the prompt.
- The behaviors must be woven naturally into the prompt language itself.
- Return ONLY valid JSON, no explanation.

Selected enhancements to embed:
${tagHints}

Response format:
{"rewritten_prompt": "...the full rewritten prompt text..."}`

  try {
    const result = await callJSON<{ rewritten_prompt: string }>(
      systemPrompt,
      `Original prompt:\n"""\n${prompt.raw_prompt}\n"""`,
      prompt.model
    )
    res.json(result)
  } catch (err) {
    console.error('Rewrite error:', err)
    res.status(500).json({ error: 'LLM call failed' })
  }
})

export default router
