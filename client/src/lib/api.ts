import type {
  PromptListItem,
  PromptWithDetails,
  Tag,
  DefaultTag,
  Me,
  SessionListItem,
  SessionWithMessages,
} from '@/types'

type TagInput = { name: string; hint: string; sort_order?: number }
import { supabase } from '@/lib/supabase'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

// Build request headers with the current Supabase access token attached as a
// Bearer token. Every API call goes through this so no fetch site can miss it.
async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: await authHeaders(init?.headers),
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

  me: () => req<Me>('/me'),

  tags: {
    list: () => req<Tag[]>('/tags'),
    create: (data: TagInput) =>
      req<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TagInput>) =>
      req<Tag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/tags/${id}`, { method: 'DELETE' }),
  },

  defaultTags: {
    list: () => req<DefaultTag[]>('/admin/default-tags'),
    create: (data: TagInput) =>
      req<DefaultTag>('/admin/default-tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TagInput>) =>
      req<DefaultTag>(`/admin/default-tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/admin/default-tags/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    list: (promptId: number) => req<SessionListItem[]>(`/sessions?prompt_id=${promptId}`),
    get: (id: number) => req<SessionWithMessages>(`/sessions/${id}`),
    create: (prompt_id: number, variable_values: Record<string, string>, compiled_prompt?: string) =>
      req<{ session_id: number; reply: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ prompt_id, variable_values, ...(compiled_prompt ? { compiled_prompt } : {}) }),
      }),
    sendMessage: (id: number, content: string) =>
      req<{ reply: string }>(`/sessions/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
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
      headers: await authHeaders(),
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
      headers: await authHeaders(),
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
