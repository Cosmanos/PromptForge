import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, streamWithSessionId, streamSSE } from '@/lib/api'
import type { Message } from '@/types'

export function useChatSession(promptId: number | undefined) {
  const qc = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id?: number }>>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  async function execute(variableValues: Record<string, string>) {
    if (!promptId) return
    setIsStreaming(true)
    setStreamingContent('')
    setMessages([])
    let fullContent = ''

    await streamWithSessionId(
      `/sessions`,
      { prompt_id: promptId, variable_values: variableValues },
      (chunk) => {
        fullContent += chunk
        setStreamingContent(fullContent)
      },
      async (sessionId) => {
        setIsStreaming(false)
        setStreamingContent('')
        if (sessionId) {
          const numSid = Number(sessionId)
          setActiveSessionId(numSid)
          await api.sessions.saveAssistant(numSid, fullContent)
          const session = await api.sessions.get(numSid)
          setMessages(session.messages)
          qc.invalidateQueries({ queryKey: ['sessions', promptId] })
        }
      },
      () => setIsStreaming(false)
    )
  }

  async function sendMessage(content: string) {
    if (!activeSessionId) return
    setMessages((prev) => [...prev, { role: 'user', content }])
    setIsStreaming(true)
    setStreamingContent('')
    let fullContent = ''

    await streamSSE(
      `/sessions/${activeSessionId}/messages`,
      { content },
      (chunk) => {
        fullContent += chunk
        setStreamingContent(fullContent)
      },
      async () => {
        setIsStreaming(false)
        setStreamingContent('')
        await api.sessions.saveMessage(activeSessionId, 'assistant', fullContent)
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }])
        qc.invalidateQueries({ queryKey: ['sessions', promptId] })
      },
      () => setIsStreaming(false)
    )
  }

  async function loadSession(sessionId: number) {
    setActiveSessionId(sessionId)
    const session = await api.sessions.get(sessionId)
    setMessages(session.messages)
  }

  return {
    activeSessionId,
    messages,
    streamingContent: isStreaming ? streamingContent : undefined,
    isStreaming,
    execute,
    sendMessage,
    loadSession,
  }
}
