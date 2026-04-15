import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

interface TagChipProps {
  tag: Tag
  isSelected: boolean
  isSuggested: boolean
  onToggle: () => void
}

export function TagChip({ tag, isSelected, isSuggested, onToggle }: TagChipProps) {
  return (
    <button
      onClick={onToggle}
      title={tag.hint}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : isSuggested
          ? 'bg-primary/10 text-primary border-primary/40 hover:bg-primary/20'
          : 'bg-background text-muted-foreground border-border hover:bg-muted'
      )}
    >
      {isSelected && <Check className="h-3 w-3" />}
      {tag.name}
    </button>
  )
}
