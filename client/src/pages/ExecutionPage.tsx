import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VariableForm } from '@/components/execution/VariableForm'
import { ChatWindow } from '@/components/execution/ChatWindow'
import { HistorySidebar } from '@/components/execution/HistorySidebar'
import { usePrompt, useConnections } from '@/hooks/usePrompts'
import { api } from '@/lib/api'
import { isModelConnected } from '@/lib/models'
import { displayTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function ExecutionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const promptId = id ? Number(id) : undefined
  const qc = useQueryClient()

  const { data: prompt, isLoading: promptLoading } = usePrompt(promptId)
  const { data: connections = [] } = useConnections()

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', promptId],
    queryFn: () => api.sessions.list(promptId!),
    enabled: !!promptId,
  })

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id?: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [hasExecuted, setHasExecuted] = useState(false)

  async function handleExecute(compiledPrompt: string, variableValues: Record<string, string>) {
    if (!promptId) return
    setIsLoading(true)
    setMessages([])
    setHasExecuted(true)
    try {
      const { session_id } = await api.sessions.create(promptId, variableValues, compiledPrompt)
      setActiveSessionId(session_id)
      const session = await api.sessions.get(session_id)
      setMessages(session.messages)
      qc.invalidateQueries({ queryKey: ['sessions', promptId] })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendMessage(content: string) {
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

  async function handleSelectSession(sessionId: number) {
    setActiveSessionId(sessionId)
    const session = await api.sessions.get(sessionId)
    setMessages(session.messages)
    setHasExecuted(true)
  }

  if (promptLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!prompt) return null

  const modelConnected = isModelConnected(
    prompt.model,
    connections.map((c) => c.provider)
  )

  const activePromptText =
    prompt.active_version === 'rewritten' && prompt.rewritten_prompt
      ? prompt.rewritten_prompt
      : prompt.raw_prompt

  return (
    <div className="h-full bg-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/prompts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium truncate">{displayTitle(prompt)}</h1>
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
          <aside className="w-64 border-r border-border bg-surface shrink-0 overflow-y-auto">
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
              <h2 className="text-xl font-medium mb-1">Run Prompt</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Fill in the variables below, then execute.
              </p>
              {/* What the prompt expects, at a glance. */}
              {prompt.variables.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-1.5">
                  {prompt.variables.map((v) => (
                    <Badge key={v.id} variant="outline" className="font-mono">
                      {v.name}
                    </Badge>
                  ))}
                </div>
              )}
              {!modelConnected && (
                <div className="mb-6 rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
                  No key connected for this prompt's model ({prompt.model}).{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Connect a model
                  </button>{' '}
                  to run it.
                </div>
              )}
              <VariableForm
                variables={prompt.variables}
                rawPrompt={activePromptText}
                onExecute={handleExecute}
                isLoading={isLoading}
                disabled={!modelConnected}
              />
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              disabled={!modelConnected}
            />
          )}
        </main>
      </div>
    </div>
  )
}
