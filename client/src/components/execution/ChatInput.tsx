import { useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  return (
    <div className="flex gap-2 border border-input rounded-xl p-3 bg-white focus-within:ring-1 focus-within:ring-ring">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="Follow up..."
        disabled={disabled}
        className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60 max-h-32"
        rows={1}
      />
      <Button size="icon" onClick={handleSend} disabled={disabled || !value.trim()} className="shrink-0 self-end">
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )
}
