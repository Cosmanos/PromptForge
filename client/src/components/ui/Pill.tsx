import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PillProps {
  children: ReactNode
  selected?: boolean
  variant?: 'default' | 'add'
  onClick?: () => void
  className?: string
  title?: string
}

// Pill / tag. default = white with border; selected = dark --accent fill with a
// check; "add" = dashed border, muted, with a plus.
export function Pill({ children, selected, variant = 'default', onClick, className, title }: PillProps) {
  const isAdd = variant === 'add'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
        isAdd
          ? 'border border-dashed border-border text-tertiary hover:text-foreground hover:border-foreground'
          : selected
            ? 'bg-primary text-primary-foreground border border-primary'
            : 'bg-surface border border-border text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {isAdd && <Plus className="h-3.5 w-3.5" />}
      {!isAdd && selected && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}
