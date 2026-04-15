import { useState, useCallback, useRef } from 'react'
import type { Segment, TextSegment, VariableSegment } from '@/types'
import { getVariableColor, colorFromString } from '@/lib/utils'
import type { Variable } from '@/types'

let segIdCounter = 0
function newId() {
  return `seg-${++segIdCounter}`
}

// Parse a raw prompt string into a segment array
export function parseRawPrompt(raw: string, existingVars: Variable[]): Segment[] {
  const varMap = new Map(existingVars.map((v) => [v.name, v]))
  const segments: Segment[] = []
  let varIndex = existingVars.length

  // Use exec loop for reliable capture groups
  const pattern = /\{\{(\w+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index)
    if (before) {
      segments.push({ type: 'text', id: newId(), content: before })
    }

    const name = match[1]
    const existing = varMap.get(name)
    const color = existing ? colorFromString(existing.color) : getVariableColor(varIndex++)
    segments.push({
      type: 'variable',
      id: newId(),
      name,
      defaultValue: existing?.default_value ?? '',
      color,
      isExpanded: false,
    } satisfies VariableSegment)

    lastIndex = pattern.lastIndex
  }

  // Remaining text after last variable
  const tail = raw.slice(lastIndex)
  segments.push({ type: 'text', id: newId(), content: tail })

  if (segments.length === 0) {
    segments.push({ type: 'text', id: newId(), content: '' })
  }

  return segments
}

// Serialize segments back to a raw prompt string
export function serializeSegments(segments: Segment[]): string {
  return segments
    .map((s) => (s.type === 'text' ? s.content : `{{${s.name}}}`))
    .join('')
}

// Extract variables from segments for saving
export function extractVariables(segments: Segment[]): Array<{
  name: string
  default_value: string
  color: string
  sort_order: number
}> {
  const seen = new Set<string>()
  const vars: ReturnType<typeof extractVariables> = []
  let order = 0
  for (const seg of segments) {
    if (seg.type === 'variable' && !seen.has(seg.name)) {
      seen.add(seg.name)
      vars.push({
        name: seg.name,
        default_value: seg.defaultValue,
        color: JSON.stringify(seg.color),
        sort_order: order++,
      })
    }
  }
  return vars
}

export interface SegmentEditorState {
  segments: Segment[]
  rawPrompt: string
  isDirty: boolean
}

export interface SegmentEditorActions {
  updateText: (id: string, content: string) => void
  updateDefaultValue: (id: string, value: string) => void
  renameVariable: (id: string, newName: string) => void
  deleteVariable: (id: string) => void
  toggleExpand: (id: string) => void
  loadFromRaw: (raw: string, vars: Variable[]) => void
  markClean: () => void
}

export function useSegmentEditor(
  initialRaw: string = '',
  initialVars: Variable[] = []
): [SegmentEditorState, SegmentEditorActions] {
  const [segments, setSegments] = useState<Segment[]>(() =>
    parseRawPrompt(initialRaw, initialVars)
  )
  const [isDirty, setIsDirty] = useState(false)
  const varCountRef = useRef(initialVars.length)

  const rawPrompt = serializeSegments(segments)

  function markDirty() {
    setIsDirty(true)
  }

  const updateText = useCallback((id: string, content: string) => {
    setSegments((prev) => {
      // Check if content contains {{varname}} pattern and split if so
      const varPattern = /\{\{(\w+)\}\}/
      const match = varPattern.exec(content)
      if (!match) {
        return prev.map((s) => (s.id === id ? { ...s, content } : s))
      }

      // Split at first {{variable}}
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev

      const before = content.slice(0, match.index)
      const varName = match[1]
      const after = content.slice(match.index + match[0].length)

      const color = getVariableColor(varCountRef.current++)

      const newSegments = [
        ...prev.slice(0, idx),
        ...(before ? [{ type: 'text' as const, id: newId(), content: before }] : []),
        {
          type: 'variable' as const,
          id: newId(),
          name: varName,
          defaultValue: '',
          color,
          isExpanded: false,
        } satisfies VariableSegment,
        ...(after ? [{ type: 'text' as const, id: newId(), content: after }] : []),
        ...prev.slice(idx + 1),
      ]

      // Ensure there are no empty text segments that would cause cursor issues
      // Actually keep them so the user can type before/after variables
      return newSegments
    })
    markDirty()
  }, [])

  const updateDefaultValue = useCallback((id: string, value: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id && s.type === 'variable' ? { ...s, defaultValue: value } : s))
    )
    markDirty()
  }, [])

  const renameVariable = useCallback((id: string, newName: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id && s.type === 'variable' ? { ...s, name: newName } : s))
    )
    markDirty()
  }, [])

  const deleteVariable = useCallback((id: string) => {
    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev

      // Merge adjacent text segments if they exist
      const before = prev[idx - 1]
      const after = prev[idx + 1]
      const newSegs = [...prev]
      newSegs.splice(idx, 1)

      if (before?.type === 'text' && after?.type === 'text') {
        const mergedIdx = idx - 1
        const merged: TextSegment = {
          type: 'text',
          id: before.id,
          content: before.content + after.content,
        }
        newSegs.splice(mergedIdx, 2, merged)
      }

      if (newSegs.length === 0) {
        return [{ type: 'text', id: newId(), content: '' }]
      }
      return newSegs
    })
    markDirty()
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id && s.type === 'variable' ? { ...s, isExpanded: !s.isExpanded } : s
      )
    )
  }, [])

  const loadFromRaw = useCallback((raw: string, vars: Variable[]) => {
    varCountRef.current = vars.length
    setSegments(parseRawPrompt(raw, vars))
    setIsDirty(false)
  }, [])

  const markClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  return [
    { segments, rawPrompt, isDirty },
    { updateText, updateDefaultValue, renameVariable, deleteVariable, toggleExpand, loadFromRaw, markClean },
  ]
}
