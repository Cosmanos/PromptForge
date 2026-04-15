import { Copy, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TryOutResponseProps {
  content: string
  isStreaming: boolean
  isStale: boolean
}

export function TryOutResponse({ content, isStreaming, isStale }: TryOutResponseProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('mt-3 rounded-lg border bg-muted/40 p-4 text-sm transition-opacity', isStale && 'opacity-40')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
          Response
          {isStale && ' (edit prompt to refresh)'}
        </span>
        {!isStreaming && content && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
      <p className={cn('whitespace-pre-wrap leading-relaxed', isStreaming && 'streaming')}>
        {content}
      </p>
    </div>
  )
}
