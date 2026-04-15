import OpenAI from 'openai'
import { Response } from 'express'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export async function callJSON<T>(
  systemPrompt: string,
  userContent: string,
  model: string = 'gpt-4o'
): Promise<T> {
  const completion = await getClient().chat.completions.create({
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

export async function streamToResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  res: Response
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const stream = await getClient().chat.completions.create({
    model,
    messages,
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`)
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
}
