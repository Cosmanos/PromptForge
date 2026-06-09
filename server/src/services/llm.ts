import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { Response } from 'express'
import { Provider } from './models'

// Provider-agnostic LLM layer. Every call carries the authenticated user's own
// decrypted key + the provider it belongs to; there is no shared/global client.
// Dispatches to OpenAI or Anthropic, papering over their API differences.

export interface LlmKey {
  provider: Provider
  apiKey: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Anthropic requires max_tokens; OpenAI treats it as optional. Use one sane
// default for both so behavior matches across providers.
const MAX_TOKENS = 4096

// Anthropic has no JSON-mode guarantee — despite instructions it may wrap JSON
// in prose or ```fences. Pull out the outermost {...} object defensively.
function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model response')
  }
  return text.slice(start, end + 1)
}

export async function callJSON<T>(
  key: LlmKey,
  systemPrompt: string,
  userContent: string,
  model: string
): Promise<T> {
  if (key.provider === 'openai') {
    const client = new OpenAI({ apiKey: key.apiKey })
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })
    const text = completion.choices[0].message.content ?? '{}'
    return JSON.parse(text) as T
  }

  const client = new Anthropic({ apiKey: key.apiKey })
  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return JSON.parse(extractJson(text)) as T
}

export async function callChat(
  key: LlmKey,
  messages: ChatMessage[],
  model: string
): Promise<string> {
  if (key.provider === 'openai') {
    const client = new OpenAI({ apiKey: key.apiKey })
    const completion = await client.chat.completions.create({ model, messages })
    return completion.choices[0].message.content ?? ''
  }

  const client = new Anthropic({ apiKey: key.apiKey })
  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    messages,
  })
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

export async function streamToResponse(
  key: LlmKey,
  messages: ChatMessage[],
  model: string,
  res: Response
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  if (key.provider === 'openai') {
    const client = new OpenAI({ apiKey: key.apiKey })
    const stream = await client.chat.completions.create({ model, messages, stream: true })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`)
      }
    }
  } else {
    const client = new Anthropic({ apiKey: key.apiKey })
    const stream = await client.messages.stream({ model, max_tokens: MAX_TOKENS, messages })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`)
      }
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
}
