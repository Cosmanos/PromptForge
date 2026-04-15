import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Pencil, X, Check } from 'lucide-react'
import type { VariableSegment } from '@/types'

interface VariableChipProps {
  segment: VariableSegment
  onRename: (newName: string) => void
  onDelete: () => void
  onToggleExpand: () => void
}

export function VariableChip({ segment, onRename, onDelete, onToggleExpand }: VariableChipProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(segment.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function commitRename() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== segment.name) {
      onRename(trimmed)
    } else {
      setEditName(segment.name)
    }
    setIsEditing(false)
  }

  const { bg, border, text } = segment.color

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium mx-0.5 align-middle select-none"
      style={{ backgroundColor: bg, borderColor: border, color: text, border: `1.5px solid ${border}` }}
    >
      <button
        onClick={onToggleExpand}
        className="rounded hover:opacity-70 p-0.5"
        title={segment.isExpanded ? 'Collapse' : 'Expand default value'}
      >
        {segment.isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditName(segment.name); setIsEditing(false) }
          }}
          className="bg-transparent outline-none w-20 text-xs"
          style={{ color: text }}
        />
      ) : (
        <span className="font-mono">{segment.name}</span>
      )}

      <span className="flex items-center gap-0.5 ml-0.5">
        {isEditing ? (
          <button
            onClick={commitRename}
            className="rounded hover:opacity-70 p-0.5"
            title="Confirm rename"
          >
            <Check className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={() => { setIsEditing(true); setEditName(segment.name) }}
            className="rounded hover:opacity-70 p-0.5"
            title="Rename variable"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded hover:opacity-70 p-0.5"
          title="Delete variable"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </span>
  )
}
