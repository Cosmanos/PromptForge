import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { Message } from '@/types'

interface ChatWindowProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string; id?: number }>
  streamingContent?: string
  isStreaming: boolean
  onSendMessage: (content: string) => void
}

export function ChatWindow({ messages, streamingContent, isStreaming, onSendMessage }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <ChatMessage key={msg.id ?? i} message={msg} />
        ))}
        {isStreaming && streamingContent !== undefined && (
          <ChatMessage
            message={{ role: 'assistant', content: streamingContent }}
            isStreaming={true}
          />
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-border shrink-0">
        <ChatInput onSend={onSendMessage} disabled={isStreaming} />
      </div>
    </div>
  )
}
