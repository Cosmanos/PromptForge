import { useState, useEffect } from 'react'
import { Play, Copy, Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { colorFromString } from '@/lib/utils'
import type { Variable } from '@/types'

type Segment =
  | { type: 'text'; content: string; index: number }
  | { type: 'variable'; name: string }

function calcRows(text: string, max = 10): number {
  const lines = (text.match(/\n/g)?.length ?? 0) + 1
  return Math.min(Math.max(2, lines), max)
}

function parseSegments(rawPrompt: string): Segment[] {
  const parts = rawPrompt.split(/({{[^}]+}})/)
  let textIdx = 0
  return parts.map((part) => {
    const match = part.match(/^{{(.+)}}$/)
    if (match) return { type: 'variable', name: match[1] }
    return { type: 'text', content: part, index: textIdx++ }
  })
}

function compileSegments(
  segments: Segment[],
  textOverrides: string[],
  variableValues: Record<string, string>
): string {
  return segments
    .map((seg) => {
      if (seg.type === 'text') return textOverrides[seg.index] ?? seg.content
      return variableValues[seg.name] ?? `{{${seg.name}}}`
    })
    .join('')
}

interface TextBlockProps {
  text: string
  onChange: (val: string) => void
}

function TextBlock({ text, onChange }: TextBlockProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text.trim())

  useEffect(() => { setDraft(text.trim()) }, [text])

  if (editing) {
    return (
      <div className="rounded-md border border-input bg-background px-3 py-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full bg-transparent text-sm outline-none resize-none"
          rows={Math.max(2, draft.split('\n').length)}
          autoFocus
        />
        <div className="flex gap-3 mt-1">
          <button
            onClick={() => { onChange(draft); setEditing(false) }}
            className="text-xs text-primary hover:underline"
          >
            Done
          </button>
          <button
            onClick={() => { setDraft(text); setEditing(false) }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative rounded-md bg-muted/40 border border-border/50 px-3 py-2 text-sm whitespace-pre-wrap text-foreground/80">
      {text.trim()}
      <button
        onClick={() => setEditing(true)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit text"
      >
        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  )
}

interface VariableFormProps {
  variables: Variable[]
  rawPrompt: string
  onExecute: (compiledPrompt: string, variableValues: Record<string, string>) => void
  isLoading?: boolean
}

export function VariableForm({ variables, rawPrompt, onExecute, isLoading }: VariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(variables.map((v) => [v.name, v.default_value]))
  )

  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev }
      for (const v of variables) {
        if (!(v.name in next)) next[v.name] = v.default_value
      }
      return next
    })
  }, [variables]) // eslint-disable-line
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const segments = parseSegments(rawPrompt)
  const [textOverrides, setTextOverrides] = useState<string[]>(() =>
    segments
      .filter((s): s is Extract<Segment, { type: 'text' }> => s.type === 'text')
      .map((s) => s.content)
  )

  useEffect(() => {
    const segs = parseSegments(rawPrompt)
    setTextOverrides(
      segs
        .filter((s): s is Extract<Segment, { type: 'text' }> => s.type === 'text')
        .map((s) => s.content)
    )
  }, [rawPrompt]) // eslint-disable-line

  const colorMap = Object.fromEntries(variables.map((v) => [v.name, colorFromString(v.color)]))

  function getCompiled() {
    return compileSegments(segments, textOverrides, values)
  }

  function handleCopy() {
    navigator.clipboard.writeText(getCompiled())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <button
        onClick={() => setPreviewOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {previewOpen ? 'Hide prompt' : 'Show prompt'}
      </button>

      {previewOpen ? (
        /* Integrated view: text blocks + variable inputs interleaved */
        <div className="space-y-3">
          {segments.map((seg, i) => {
            if (seg.type === 'text') {
              if (!seg.content.trim()) return null
              return (
                <TextBlock
                  key={i}
                  text={textOverrides[seg.index] ?? seg.content}
                  onChange={(val) =>
                    setTextOverrides((prev) => {
                      const next = [...prev]
                      next[seg.index] = val
                      return next
                    })
                  }
                />
              )
            }

            const color = colorMap[seg.name]
            const v = variables.find((v) => v.name === seg.name)
            if (!v || !color) return null

            return (
              <div key={i}>
                <div className="mb-1.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                  >
                    {seg.name}
                  </span>
                </div>
                <textarea
                  value={values[seg.name] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [seg.name]: e.target.value }))}
                  placeholder={`Enter ${seg.name}...`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-y overflow-y-auto"
                  rows={calcRows(v.default_value)}
                  style={{ borderLeftColor: color.border, borderLeftWidth: 2 }}
                />
              </div>
            )
          })}
        </div>
      ) : (
        /* Standard view: just variable inputs */
        <div className="space-y-5">
          {variables.length === 0 ? (
            <p className="text-sm text-muted-foreground">This prompt has no variables.</p>
          ) : (
            variables.map((v) => {
              const color = colorFromString(v.color)
              return (
                <div key={v.id}>
                  <label className="block text-sm font-medium mb-1.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs mr-2 font-mono"
                      style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                    >
                      {v.name}
                    </span>
                  </label>
                  <textarea
                    value={values[v.name] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={`Enter ${v.name}...`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-y overflow-y-auto"
                    rows={calcRows(v.default_value)}
                    style={{ borderLeftColor: color.border, borderLeftWidth: 2 }}
                  />
                </div>
              )
            })
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onExecute(getCompiled(), values)} disabled={isLoading} className="flex-1 gap-2">
          <Play className="h-4 w-4" />
          Execute
        </Button>
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy Prompt'}
        </Button>
      </div>
    </div>
  )
}
