import type {
  PromptListItem,
  PromptWithDetails,
  Tag,
  SessionListItem,
  SessionWithMessages,
} from '@/types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---- Prompts ----

export const api = {
  prompts: {
    list: () => req<PromptListItem[]>('/prompts'),
    get: (id: number) => req<PromptWithDetails>(`/prompts/${id}`),
    create: (data?: { name?: string; model?: string }) =>
      req<PromptWithDetails>('/prompts', { method: 'POST', body: JSON.stringify(data ?? {}) }),
    update: (id: number, data: Partial<Omit<PromptWithDetails, 'variables'>> & { tag_ids?: number[]; variables?: Array<{ name: string; default_value: string; color: string; sort_order: number }> }) =>
      req<PromptWithDetails>(`/prompts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/prompts/${id}`, { method: 'DELETE' }),
    analyze: (id: number) =>
      req<{ suggested_tag_ids: number[] }>(`/prompts/${id}/analyze`, { method: 'POST' }),
    rewrite: (id: number, tag_ids: number[]) =>
      req<{ rewritten_prompt: string }>(`/prompts/${id}/rewrite`, {
        method: 'POST',
        body: JSON.stringify({ tag_ids }),
      }),
  },

  tags: {
    list: () => req<Tag[]>('/tags'),
  },

  sessions: {
    list: (promptId: number) => req<SessionListItem[]>(`/sessions?prompt_id=${promptId}`),
    get: (id: number) => req<SessionWithMessages>(`/sessions/${id}`),
    create: (prompt_id: number, variable_values: Record<string, string>) =>
      req<{ session_id: number }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ prompt_id, variable_values }),
      }),
    saveAssistant: (sessionId: number, content: string) =>
      req<{ ok: boolean }>(`/sessions/${sessionId}/save-assistant`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    saveMessage: (sessionId: number, role: string, content: string) =>
      req<{ ok: boolean }>(`/sessions/${sessionId}/save-message`, {
        method: 'POST',
        body: JSON.stringify({ role, content }),
      }),
  },
}

// ---- SSE Streaming ----

export async function streamSSE(
  path: string,
  body: unknown,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError?: (err: Error) => void
): Promise<void> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? res.statusText)
    }

    const sessionId = res.headers.get('X-Session-Id')
    if (sessionId) {
      // Store session ID for callers that need it
      ;(res as unknown as { _sessionId: string })._sessionId = sessionId
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data) as { content: string }
            onChunk(parsed.content)
          } catch {
            // ignore malformed
          }
        }
      }
    }
    onDone()
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}

export async function streamWithSessionId(
  path: string,
  body: unknown,
  onChunk: (content: string) => void,
  onDone: (sessionId: string | null) => void,
  onError?: (err: Error) => void
): Promise<void> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? res.statusText)
    }

    const sessionId = res.headers.get('X-Session-Id')

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onDone(sessionId)
            return
          }
          try {
            const parsed = JSON.parse(data) as { content: string }
            onChunk(parsed.content)
          } catch {
            // ignore malformed
          }
        }
      }
    }
    onDone(sessionId)
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}
