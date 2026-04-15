import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Play,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagBar } from '@/components/builder/TagBar'
import { SegmentEditor } from '@/components/builder/SegmentEditor'
import { VersionToggle } from '@/components/builder/VersionToggle'
import { TryOutResponse } from '@/components/builder/TryOutResponse'
import { usePrompt, useTags, useAnalyzePrompt, useRewritePrompt, useUpdatePrompt, useCreatePrompt } from '@/hooks/usePrompts'
import { useSegmentEditor } from '@/hooks/useSegmentEditor'
import { useAutoSave } from '@/hooks/useAutoSave'
import { streamSSE } from '@/lib/api'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']

export function BuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [promptId, setPromptId] = useState<number | undefined>(
    isNew ? undefined : (id ? Number(id) : undefined)
  )

  const { data: prompt, isLoading } = usePrompt(promptId)
  const { data: allTags = [] } = useTags()
  const analyze = useAnalyzePrompt()
  const rewrite = useRewritePrompt()
  const updatePrompt = useUpdatePrompt()
  const createPrompt = useCreatePrompt()
  const creatingRef = useRef(false)

  // Builder state
  const [name, setName] = useState('Untitled Prompt')
  const [model, setModel] = useState('gpt-4o')
  const [activeVersion, setActiveVersion] = useState<'original' | 'rewritten'>('original')
  const [rewrittenPrompt, setRewrittenPrompt] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [suggestedTagIds, setSuggestedTagIds] = useState<number[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [isRewriteStale, setIsRewriteStale] = useState(false)

  // Try Out state
  const [tryOutContent, setTryOutContent] = useState('')
  const [isTryOutStreaming, setIsTryOutStreaming] = useState(false)
  const [isTryOutStale, setIsTryOutStale] = useState(false)
  const [showTryOut, setShowTryOut] = useState(false)

  // Segment editor for original prompt
  const [editorState, editorActions] = useSegmentEditor('', [])

  // Segment editor for rewritten prompt (separate)
  const [rewrittenEditorState, rewrittenEditorActions] = useSegmentEditor('', [])

  // Load prompt data once
  const [initialized, setInitialized] = useState(isNew)
  useEffect(() => {
    if (prompt && !initialized) {
      setName(prompt.name)
      setModel(prompt.model)
      setActiveVersion(prompt.active_version)
      setRewrittenPrompt(prompt.rewritten_prompt)
      setSelectedTagIds(prompt.tag_ids)
      editorActions.loadFromRaw(prompt.raw_prompt, prompt.variables)
      if (prompt.rewritten_prompt) {
        rewrittenEditorActions.loadFromRaw(prompt.rewritten_prompt, prompt.variables)
      }
      setInitialized(true)
    }
  }, [prompt, initialized]) // eslint-disable-line

  // Lazy creation: only create the prompt record when the user starts typing
  useEffect(() => {
    if (!isNew || promptId || creatingRef.current) return
    const hasContent = editorState.isDirty || name !== 'Untitled Prompt'
    if (!hasContent) return
    creatingRef.current = true
    createPrompt.mutateAsync({}).then((newPrompt) => {
      setPromptId(newPrompt.id)
      window.history.replaceState(null, '', `/builder/${newPrompt.id}`)
    })
  }, [isNew, promptId, editorState.isDirty, name]) // eslint-disable-line

  // Auto-save original
  useAutoSave({
    promptId,
    state: editorState,
    name,
    model,
    rewrittenPrompt: activeVersion === 'rewritten' ? rewrittenEditorState.rawPrompt : rewrittenPrompt,
    activeVersion,
    tagIds: selectedTagIds,
  })

  // Auto-save rewritten
  useAutoSave({
    promptId,
    state: rewrittenEditorState,
    name,
    model,
    rewrittenPrompt: rewrittenEditorState.rawPrompt,
    activeVersion,
    tagIds: selectedTagIds,
  })

  function handleOriginalChange(id: string, content: string) {
    editorActions.updateText(id, content)
    // Editing original after rewrite marks rewrite as stale
    if (rewrittenPrompt) setIsRewriteStale(true)
    // Invalidate try out
    setIsTryOutStale(true)
  }

  async function handleAnalyze() {
    if (!promptId) return
    // Save first
    await updatePrompt.mutateAsync({
      id: promptId,
      data: {
        raw_prompt: editorState.rawPrompt,
        name,
        model,
      },
    })
    const result = await analyze.mutateAsync(promptId)
    setSuggestedTagIds(result.suggested_tag_ids)
    // Auto-select suggested tags
    setSelectedTagIds(result.suggested_tag_ids)
    setHasAnalyzed(true)
  }

  async function handleRewrite() {
    if (!promptId || selectedTagIds.length === 0) return
    const result = await rewrite.mutateAsync({ id: promptId, tag_ids: selectedTagIds })
    setRewrittenPrompt(result.rewritten_prompt)
    rewrittenEditorActions.loadFromRaw(result.rewritten_prompt, prompt?.variables ?? [])
    setActiveVersion('rewritten')
    setIsRewriteStale(false)
    // Save rewritten prompt
    await updatePrompt.mutateAsync({
      id: promptId,
      data: {
        rewritten_prompt: result.rewritten_prompt,
        active_version: 'rewritten',
        tag_ids: selectedTagIds,
      },
    })
  }

  function handleToggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleTryOut = useCallback(async () => {
    if (!promptId) return
    // Save latest state first
    await updatePrompt.mutateAsync({
      id: promptId,
      data: {
        raw_prompt: editorState.rawPrompt,
        name,
        model,
      },
    })
    setTryOutContent('')
    setIsTryOutStreaming(true)
    setIsTryOutStale(false)
    setShowTryOut(true)

    await streamSSE(
      `/prompts/${promptId}/tryout`,
      {},
      (chunk) => setTryOutContent((prev) => prev + chunk),
      () => setIsTryOutStreaming(false),
      () => setIsTryOutStreaming(false)
    )
  }, [promptId, editorState.rawPrompt, name, model, updatePrompt])

  function handleVersionChange(version: 'original' | 'rewritten') {
    setActiveVersion(version)
    updatePrompt.mutate({ id: promptId!, data: { active_version: version } })
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeEditorState = activeVersion === 'rewritten' && rewrittenPrompt
    ? rewrittenEditorState
    : editorState
  const activeEditorActions = activeVersion === 'rewritten' && rewrittenPrompt
    ? rewrittenEditorActions
    : { ...editorActions, updateText: handleOriginalChange }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-white shrink-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border-0 shadow-none text-base font-semibold focus-visible:ring-0 px-0"
            placeholder="Prompt name..."
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 flex-1 w-full space-y-4 overflow-y-auto">
        {/* Tags */}
        <TagBar
          tags={allTags}
          selectedTagIds={selectedTagIds}
          suggestedTagIds={suggestedTagIds}
          onToggleTag={handleToggleTag}
          onRewrite={handleRewrite}
          isRewriteLoading={rewrite.isPending}
          isRewriteStale={isRewriteStale}
          showRewrite={hasAnalyzed || selectedTagIds.length > 0}
        />

        {/* Version toggle */}
        {rewrittenPrompt && (
          <VersionToggle activeVersion={activeVersion} onChange={handleVersionChange} />
        )}

        {/* Prompt Editor */}
        <SegmentEditor
          segments={activeEditorState.segments}
          actions={activeEditorActions}
          placeholder="Write your prompt here... Use {{variable}} for dynamic parts."
        />

        {/* Toolbar */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyze.isPending}
            className="gap-2"
          >
            {analyze.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasAnalyzed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {analyze.isPending ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="outline"
            onClick={handleTryOut}
            disabled={isTryOutStreaming}
            className="gap-2"
          >
            {isTryOutStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Try Out
          </Button>
        </div>

        {/* Try Out Response */}
        {showTryOut && (
          <TryOutResponse
            content={tryOutContent}
            isStreaming={isTryOutStreaming}
            isStale={isTryOutStale}
          />
        )}
      </main>
    </div>
  )
}
