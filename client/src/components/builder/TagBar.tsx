import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Tag } from '@/types'

interface TagBarProps {
  tags: Tag[]
  appliedTagIds: number[]
  // Transient Analyze output; already excludes applied tags.
  suggestedTagIds: number[]
  onApply: (id: number) => void
  onRemove: (id: number) => void
  onRewrite: () => void
  isRewriteLoading: boolean
  isRewriteStale: boolean
  showRewrite: boolean
}

// Two-section tag area: Suggestions (transient, from Analyze — click to apply)
// and Applied (persisted as prompt_tags — what Rewrite consumes), plus a "+"
// card that opens a searchable multi-select of all the user's tags.
export function TagBar({
  tags,
  appliedTagIds,
  suggestedTagIds,
  onApply,
  onRemove,
  onRewrite,
  isRewriteLoading,
  isRewriteStale,
  showRewrite,
}: TagBarProps) {
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const suggested = suggestedTagIds.map((id) => byId.get(id)).filter((t): t is Tag => t != null)
  const applied = appliedTagIds.map((id) => byId.get(id)).filter((t): t is Tag => t != null)

  // Countering pairs within the Applied set (warn-only, never blocks).
  // counter_tag_ids is expanded in both directions, so keep only id < cid
  // to report each pair once.
  const counterPairs = useMemo(() => {
    const appliedSet = new Set(appliedTagIds)
    const pairs: [Tag, Tag][] = []
    for (const t of applied) {
      for (const cid of t.counter_tag_ids) {
        if (t.id < cid && appliedSet.has(cid)) {
          const other = byId.get(cid)
          if (other) pairs.push([t, other])
        }
      }
    }
    return pairs
  }, [applied, appliedTagIds, byId])

  return (
    <div className="space-y-2 py-2">
      {/* Suggestions */}
      {suggested.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Suggestions
          </span>
          {suggested.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onApply(tag.id)}
              title={tag.hint}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Applied */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Applied</span>
        {applied.map((tag) => (
          <span
            key={tag.id}
            title={tag.hint}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onRemove(tag.id)}
              className="opacity-70 transition-opacity hover:opacity-100"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <AddTagDropdown tags={tags} appliedTagIds={appliedTagIds} onApply={onApply} onRemove={onRemove} />
        {showRewrite && (
          <Button
            size="sm"
            variant={isRewriteStale ? 'outline' : 'default'}
            onClick={onRewrite}
            disabled={applied.length === 0 || isRewriteLoading}
            className="ml-auto shrink-0 gap-1.5"
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

      {/* Counter-tag warnings (non-blocking) */}
      {counterPairs.map(([a, b]) => (
        <p key={`${a.id}-${b.id}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
          <span>
            <span className="font-medium text-foreground">{a.name}</span> and{' '}
            <span className="font-medium text-foreground">{b.name}</span> counter each other — the
            rewrite may pull in opposite directions. You can proceed anyway.
          </span>
        </p>
      ))}
    </div>
  )
}

// "+" card at the end of the Applied row: searchable, scrollable checkbox
// multi-select over all of the user's tags.
function AddTagDropdown({
  tags,
  appliedTagIds,
  onApply,
  onRemove,
}: {
  tags: Tag[]
  appliedTagIds: number[]
  onApply: (id: number) => void
  onRemove: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const q = filter.trim().toLowerCase()
  const shown = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setFilter('')
        }}
        title="Add tags"
        aria-label="Add tags"
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags..."
            className="mb-1.5 h-8 text-xs"
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {shown.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-tertiary">No tags found.</p>
            )}
            {shown.map((tag) => {
              const checked = appliedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => (checked ? onRemove(tag.id) : onApply(tag.id))}
                  title={tag.hint}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-surface'
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{tag.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
