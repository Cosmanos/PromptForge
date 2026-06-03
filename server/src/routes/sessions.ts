import { Router, Request, Response } from 'express'
import { z } from 'zod'
import sql from '../db/database'
import { callChat } from '../services/openai'
import { compilePrompt } from '../services/promptBuilder'
import { Prompt, Variable, Session, Message } from '../types'
import OpenAI from 'openai'

const router = Router()

const CreateSessionSchema = z.object({
  prompt_id: z.number(),
  variable_values: z.record(z.string()),
  compiled_prompt: z.string().optional(),
})

const AddMessageSchema = z.object({
  content: z.string().min(1),
})

// POST /api/sessions — create session, await full reply, return JSON
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { prompt_id, variable_values, compiled_prompt: precompiled } = parsed.data
  const userId = req.userId!

  const [prompt] = await sql<Prompt[]>`
    SELECT * FROM prompts WHERE id = ${prompt_id} AND user_id = ${userId}
  `
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const variables = await sql<Variable[]>`SELECT * FROM variables WHERE prompt_id = ${prompt_id}`

  const merged: Record<string, string> = {}
  for (const v of variables) {
    merged[v.name] = variable_values[v.name] ?? v.default_value
  }

  const activePrompt =
    prompt.active_version === 'rewritten' && prompt.rewritten_prompt
      ? prompt.rewritten_prompt
      : prompt.raw_prompt

  const compiled = precompiled ?? compilePrompt(activePrompt, merged)

  const [{ id: sessionId }] = await sql<[{ id: number }]>`
    INSERT INTO sessions (prompt_id, user_id, variable_values, compiled_prompt, model)
    VALUES (${prompt_id}, ${userId}, ${JSON.stringify(merged)}, ${compiled}, ${prompt.model})
    RETURNING id
  `
  const sid = Number(sessionId)

  await sql`INSERT INTO messages (session_id, role, content) VALUES (${sid}, 'user', ${compiled})`

  const reply = await callChat([{ role: 'user', content: compiled }], prompt.model)

  await sql`INSERT INTO messages (session_id, role, content) VALUES (${sid}, 'assistant', ${reply})`

  res.json({ session_id: sid, reply })
})

// POST /api/sessions/:id/messages — follow-up, await full reply, return JSON
router.post('/:id/messages', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const [session] = await sql<Session[]>`
    SELECT * FROM sessions WHERE id = ${id} AND user_id = ${req.userId!}
  `
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const parsed = AddMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { content } = parsed.data

  const priorMessages = await sql<Message[]>`
    SELECT * FROM messages WHERE session_id = ${id} ORDER BY created_at
  `

  await sql`INSERT INTO messages (session_id, role, content) VALUES (${id}, 'user', ${content})`

  const messagesForLLM: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...priorMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content },
  ]

  const reply = await callChat(messagesForLLM, session.model)

  await sql`INSERT INTO messages (session_id, role, content) VALUES (${id}, 'assistant', ${reply})`

  res.json({ reply })
})

// GET /api/sessions/:id — full session with messages
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const [session] = await sql<Session[]>`
    SELECT * FROM sessions WHERE id = ${id} AND user_id = ${req.userId!}
  `
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const messages = await sql<Message[]>`
    SELECT * FROM messages WHERE session_id = ${id} ORDER BY created_at
  `
  res.json({ ...session, messages })
})

// GET /api/sessions — list sessions for a prompt (query param: prompt_id)
router.get('/', async (req: Request, res: Response) => {
  const promptId = Number(req.query.prompt_id)
  if (!promptId) return res.status(400).json({ error: 'prompt_id required' })

  // Scoping by user_id isolates the caller; another user's prompt_id yields [].
  const sessions = await sql`
    SELECT s.*,
      (SELECT content FROM messages WHERE session_id = s.id ORDER BY created_at LIMIT 1) as first_message,
      (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
    FROM sessions s
    WHERE s.prompt_id = ${promptId} AND s.user_id = ${req.userId!}
    ORDER BY s.created_at DESC
  `
  res.json(sessions)
})

export default router
