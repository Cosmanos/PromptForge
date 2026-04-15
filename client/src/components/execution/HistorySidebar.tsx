import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionListItem } from '@/types'

interface HistorySidebarProps {
  sessions: SessionListItem[]
  activeSessionId: number | null
  onSelectSession: (id: number) => void
}

export function HistorySidebar({ sessions, activeSessionId, onSelectSession }: HistorySidebarProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No previous runs yet.
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {sessions.map((session) => {
        const date = new Date(session.created_at).toLocaleDateString()
        const snippet = session.first_message?.slice(0, 60) ?? ''
        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              'w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted',
              activeSessionId === session.id && 'bg-muted font-medium'
            )}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <MessageSquare className="h-3 w-3" />
              {date} · {session.message_count} messages
            </div>
            <p className="truncate text-xs">{snippet}…</p>
          </button>
        )
      })}
    </div>
  )
}
