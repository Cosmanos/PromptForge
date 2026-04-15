import { useRef, useEffect, useCallback } from 'react'
import { VariableChip } from './VariableChip'
import { VariableExpanded } from './VariableExpanded'
import type { Segment } from '@/types'
import type { SegmentEditorActions } from '@/hooks/useSegmentEditor'

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange(e.target.value)
        resize()
      }}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed block"
    />
  )
}

interface SegmentEditorProps {
  segments: Segment[]
  actions: SegmentEditorActions
  placeholder?: string
  disabled?: boolean
}

export function SegmentEditor({ segments, actions, placeholder, disabled }: SegmentEditorProps) {
  const hasContent = segments.some((s) => s.type !== 'text' || s.content.trim())

  return (
    <div className="min-h-[200px] w-full rounded-lg border border-input bg-white p-4 text-sm focus-within:ring-1 focus-within:ring-ring">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <AutoResizeTextarea
              key={seg.id}
              value={seg.content}
              onChange={(val) => actions.updateText(seg.id, val)}
              placeholder={i === 0 && !hasContent ? placeholder : undefined}
              disabled={disabled}
            />
          )
        }

        if (seg.isExpanded) {
          return (
            <VariableExpanded
              key={seg.id}
              segment={seg}
              onRename={(name) => actions.renameVariable(seg.id, name)}
              onDelete={() => actions.deleteVariable(seg.id)}
              onToggleExpand={() => actions.toggleExpand(seg.id)}
              onUpdateDefault={(val) => actions.updateDefaultValue(seg.id, val)}
            />
          )
        }

        return (
          <VariableChip
            key={seg.id}
            segment={seg}
            onRename={(name) => actions.renameVariable(seg.id, name)}
            onDelete={() => actions.deleteVariable(seg.id)}
            onToggleExpand={() => actions.toggleExpand(seg.id)}
          />
        )
      })}
    </div>
  )
}
