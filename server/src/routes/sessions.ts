import { Router, Request, Response } from 'express'
import { z } from 'zod'
import db from '../db/database'
import { streamToResponse } from '../services/openai'
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

// POST /api/sessions — create a new session and send first message
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { prompt_id, variable_values, compiled_prompt: precompiled } = parsed.data

  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(prompt_id) as Prompt | undefined
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' })

  const variables = db
    .prepare('SELECT * FROM variables WHERE prompt_id = ?')
    .all(prompt_id) as Variable[]

  // Merge: use provided values, fall back to defaults
  const merged: Record<string, string> = {}
  for (const v of variables) {
    merged[v.name] = variable_values[v.name] ?? v.default_value
  }

  const activePrompt =
    prompt.active_version === 'rewritten' && prompt.rewritten_prompt
      ? prompt.rewritten_prompt
      : prompt.raw_prompt

  const compiled = precompiled ?? compilePrompt(activePrompt, merged)

  // Insert session
  const sessionResult = db
    .prepare(
      `INSERT INTO sessions (prompt_id, variable_values, compiled_prompt, model)
       VALUES (@prompt_id, @variable_values, @compiled_prompt, @model)`
    )
    .run({
      prompt_id,
      variable_values: JSON.stringify(merged),
      compiled_prompt: compiled,
      model: prompt.model,
    })

  const sessionId = sessionResult.lastInsertRowid as number

  // Insert first user message
  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (@session_id, @role, @content)')
    .run({ session_id: sessionId, role: 'user', content: compiled })

  // Stream the response
  res.setHeader('X-Session-Id', String(sessionId))
  await streamToResponse(
    [{ role: 'user', content: compiled }],
    prompt.model,
    res
  )

  // Note: after stream ends we can't easily save the full assistant response
  // We handle this via a separate save endpoint, OR we capture the full content during stream
  // For MVP simplicity: the client will send the full assistant response back for saving
})

// POST /api/sessions/:id/save-assistant — save assistant reply after stream
router.post('/:id/save-assistant', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (@session_id, @role, @content)')
    .run({ session_id: id, role: 'assistant', content })

  res.json({ ok: true })
})

// POST /api/sessions/:id/messages — follow-up message (streams reply)
router.post('/:id/messages', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const parsed = AddMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { content } = parsed.data

  // Load all prior messages for context
  const priorMessages = db
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at')
    .all(id) as Message[]

  // Save the new user message
  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (@session_id, @role, @content)')
    .run({ session_id: id, role: 'user', content })

  const messagesForLLM: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...priorMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content },
  ]

  await streamToResponse(messagesForLLM, session.model, res)
})

// POST /api/sessions/:id/save-message — save a follow-up assistant reply
router.post('/:id/save-message', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { role, content } = req.body
  if (!content || !role) return res.status(400).json({ error: 'role and content required' })

  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (@session_id, @role, @content)')
    .run({ session_id: id, role, content })

  res.json({ ok: true })
})

// GET /api/sessions/:id — full session with messages
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const messages = db
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at')
    .all(id) as Message[]

  res.json({ ...session, messages })
})

// GET /api/sessions — list sessions for a prompt (query param: prompt_id)
router.get('/', (req: Request, res: Response) => {
  const promptId = Number(req.query.prompt_id)
  if (!promptId) return res.status(400).json({ error: 'prompt_id required' })

  const sessions = db
    .prepare(
      `SELECT s.*,
        (SELECT content FROM messages WHERE session_id = s.id ORDER BY created_at LIMIT 1) as first_message,
        (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
       FROM sessions s
       WHERE s.prompt_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(promptId)

  res.json(sessions)
})

export default router
