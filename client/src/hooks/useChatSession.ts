import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useChatSession(promptId: number | undefined) {
  const qc = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id?: number }>>([])
  const [isLoading, setIsLoading] = useState(false)

  async function execute(variableValues: Record<string, string>) {
    if (!promptId) return
    setIsLoading(true)
    setMessages([])
    try {
      const { session_id } = await api.sessions.create(promptId, variableValues)
      setActiveSessionId(session_id)
      const session = await api.sessions.get(session_id)
      setMessages(session.messages)
      qc.invalidateQueries({ queryKey: ['sessions', promptId] })
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage(content: string) {
    if (!activeSessionId) return
    setMessages((prev) => [...prev, { role: 'user', content }])
    setIsLoading(true)
    try {
      const { reply } = await api.sessions.sendMessage(activeSessionId, content)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      qc.invalidateQueries({ queryKey: ['sessions', promptId] })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSession(sessionId: number) {
    setActiveSessionId(sessionId)
    const session = await api.sessions.get(sessionId)
    setMessages(session.messages)
  }

  return { activeSessionId, messages, isLoading, execute, sendMessage, loadSession }
}
