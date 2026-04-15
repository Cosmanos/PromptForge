import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VariableForm } from '@/components/execution/VariableForm'
import { ChatWindow } from '@/components/execution/ChatWindow'
import { HistorySidebar } from '@/components/execution/HistorySidebar'
import { usePrompt } from '@/hooks/usePrompts'
import { api, streamWithSessionId, streamSSE } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Message, SessionListItem } from '@/types'

export function ExecutionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const promptId = id ? Number(id) : undefined
  const qc = useQueryClient()

  const { data: prompt, isLoading } = usePrompt(promptId)

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', promptId],
    queryFn: () => api.sessions.list(promptId!),
    enabled: !!promptId,
  })

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id?: number }>>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [hasExecuted, setHasExecuted] = useState(false)

  async function handleExecute(compiledPrompt: string, variableValues: Record<string, string>) {
    if (!promptId) return
    setIsStreaming(true)
    setStreamingContent('')
    setMessages([])
    setHasExecuted(true)

    let fullContent = ''
    let sessionId: string | null = null

    await streamWithSessionId(
      `/sessions`,
      { prompt_id: promptId, variable_values: variableValues, compiled_prompt: compiledPrompt },
      (chunk) => {
        fullContent += chunk
        setStreamingContent(fullContent)
      },
      async (sid) => {
        sessionId = sid
        setIsStreaming(false)
        setStreamingContent('')

        if (sessionId) {
          const numSid = Number(sessionId)
          setActiveSessionId(numSid)

          // Save assistant reply
          await api.sessions.saveAssistant(numSid, fullContent)

          // Load session messages
          const session = await api.sessions.get(numSid)
          setMessages(session.messages)

          // Refresh history
          qc.invalidateQueries({ queryKey: ['sessions', promptId] })
        }
      },
      () => {
        setIsStreaming(false)
      }
    )
  }

  async function handleSendMessage(content: string) {
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
        // Save assistant reply
        await api.sessions.saveMessage(activeSessionId, 'assistant', fullContent)
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }])
        qc.invalidateQueries({ queryKey: ['sessions', promptId] })
      },
      () => setIsStreaming(false)
    )
  }

  async function handleSelectSession(sessionId: number) {
    setActiveSessionId(sessionId)
    const session = await api.sessions.get(sessionId)
    setMessages(session.messages)
    setHasExecuted(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!prompt) return null

  const activePromptText =
    prompt.active_version === 'rewritten' && prompt.rewritten_prompt
      ? prompt.rewritten_prompt
      : prompt.raw_prompt

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">{prompt.name}</h1>
            <p className="text-xs text-muted-foreground">
              {prompt.active_version === 'rewritten' ? 'Rewritten prompt' : 'Original prompt'} · {prompt.model}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar((v) => !v)}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 border-r border-border bg-white shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Run History
              </p>
            </div>
            <HistorySidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
            />
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {!hasExecuted ? (
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
              <h2 className="text-xl font-semibold mb-1">Run Prompt</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Fill in the variables below, then execute.
              </p>
              <VariableForm
                variables={prompt.variables}
                rawPrompt={activePromptText}
                onExecute={handleExecute}
                isLoading={isStreaming}
              />
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              streamingContent={isStreaming ? streamingContent : undefined}
              isStreaming={isStreaming}
              onSendMessage={handleSendMessage}
            />
          )}
        </main>
      </div>
    </div>
  )
}
