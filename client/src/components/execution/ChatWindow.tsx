import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface ChatWindowProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string; id?: number }>
  isLoading: boolean
  onSendMessage: (content: string) => void
  disabled?: boolean
}

export function ChatWindow({ messages, isLoading, onSendMessage, disabled }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <ChatMessage key={msg.id ?? i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-border shrink-0">
        <ChatInput onSend={onSendMessage} disabled={isLoading || disabled} />
      </div>
    </div>
  )
}
