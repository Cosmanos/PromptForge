import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagChip } from './TagChip'
import type { Tag } from '@/types'

interface TagBarProps {
  tags: Tag[]
  selectedTagIds: number[]
  suggestedTagIds: number[]
  onToggleTag: (id: number) => void
  onRewrite: () => void
  isRewriteLoading: boolean
  isRewriteStale: boolean
  showRewrite: boolean
}

export function TagBar({
  tags,
  selectedTagIds,
  suggestedTagIds,
  onToggleTag,
  onRewrite,
  isRewriteLoading,
  isRewriteStale,
  showRewrite,
}: TagBarProps) {
  const hasSelection = selectedTagIds.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5" />
        Tags
      </span>
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          isSelected={selectedTagIds.includes(tag.id)}
          isSuggested={suggestedTagIds.includes(tag.id)}
          onToggle={() => onToggleTag(tag.id)}
        />
      ))}
      {showRewrite && (
        <Button
          size="sm"
          variant={isRewriteStale ? 'outline' : 'default'}
          onClick={onRewrite}
          disabled={!hasSelection || isRewriteLoading}
          className="ml-auto gap-1.5 shrink-0"
        >
          {isRewriteLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isRewriteStale ? 'Rewrite (out of date)' : 'Rewrite'}
        </Button>
      )}
    </div>
  )
}
