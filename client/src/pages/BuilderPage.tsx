import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2,
  CheckCircle2,
  Play,
  Wand2,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagBar } from '@/components/builder/TagBar'
import { PromptEditor, type PromptEditorHandle } from '@/components/builder/PromptEditor'
import { VersionToggle } from '@/components/builder/VersionToggle'
import { TryOutResponse } from '@/components/builder/TryOutResponse'
import { usePrompt, useTags, useAnalyzePrompt, useRewritePrompt, useUpdatePrompt, useCreatePrompt, useConnections } from '@/hooks/usePrompts'
import { useAutoSave } from '@/hooks/useAutoSave'
import { streamSSE } from '@/lib/api'
import { MODELS, modelInfo, isModelConnected } from '@/lib/models'
import { ModelSelectorChip } from '@/components/ui/ModelSelectorChip'
import { VariableStoreProvider, useVariableStore } from '@/lib/variableStore'

export function BuilderPage() {
  // The variable store is the single source of truth for defaults/colors and is
  // shared by the original and rewritten editors (spec §1, §7).
  return (
    <VariableStoreProvider>
      <BuilderContent />
    </VariableStoreProvider>
  )
}

function BuilderContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id == null
  const [promptId, setPromptId] = useState<number | undefined>(
    id ? Number(id) : undefined
  )

  const store = useVariableStore()
  const { data: prompt } = usePrompt(promptId)
  const { data: allTags = [] } = useTags()
  const { data: connections = [] } = useConnections()
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
  // Applied = the tags Rewrite consumes, persisted as prompt_tags. Suggestions
  // are transient Analyze output and never persisted.
  const [appliedTagIds, setAppliedTagIds] = useState<number[]>([])
  const [suggestedTagIds, setSuggestedTagIds] = useState<number[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [isRewriteStale, setIsRewriteStale] = useState(false)

  // Editor-derived state
  const [originalRaw, setOriginalRaw] = useState('')
  const [originalDirty, setOriginalDirty] = useState(false)
  const [rewrittenRaw, setRewrittenRaw] = useState('')
  const [rewrittenDirty, setRewrittenDirty] = useState(false)
  const [metaDirty, setMetaDirty] = useState(false)

  const originalRef = useRef<PromptEditorHandle>(null)
  const rewrittenRef = useRef<PromptEditorHandle>(null)

  // Try Out state
  const [tryOutContent, setTryOutContent] = useState('')
  const [isTryOutStreaming, setIsTryOutStreaming] = useState(false)
  const [isTryOutStale, setIsTryOutStale] = useState(false)
  const [showTryOut, setShowTryOut] = useState(false)

  // Load prompt data once. Seed the variable store before the editors mount so
  // their inline defaults/colors render from persisted values.
  const [initialized, setInitialized] = useState(isNew)
  useEffect(() => {
    if (prompt && !initialized) {
      setName(prompt.name)
      setModel(prompt.model)
      setActiveVersion(prompt.active_version)
      setRewrittenPrompt(prompt.rewritten_prompt)
      setAppliedTagIds(prompt.tag_ids)
      store.loadVariables(prompt.variables)
      setInitialized(true)
    }
  }, [prompt, initialized]) // eslint-disable-line

  // Lazy creation: only create the prompt record when the user starts working.
  useEffect(() => {
    if (!isNew || promptId || creatingRef.current) return
    const hasContent = originalDirty || metaDirty || name !== 'Untitled Prompt'
    if (!hasContent) return
    creatingRef.current = true
    createPrompt.mutateAsync({}).then((newPrompt) => {
      setPromptId(newPrompt.id)
      window.history.replaceState(null, '', `/build/${newPrompt.id}`)
    })
  }, [isNew, promptId, originalDirty, metaDirty, name]) // eslint-disable-line

  // Auto-save original prompt + variables.
  useAutoSave(
    promptId,
    {
      name,
      model,
      raw_prompt: originalRaw,
      active_version: activeVersion,
      tag_ids: appliedTagIds,
      variables: store.variables,
    },
    initialized && (originalDirty || metaDirty || store.isDirty)
  )

  // Auto-save rewritten prompt (its own field only — never clobbers raw_prompt).
  useAutoSave(
    promptId,
    { rewritten_prompt: rewrittenRaw },
    initialized && rewrittenPrompt != null && rewrittenDirty
  )

  const handleOriginalChange = useCallback(
    (raw: string, dirty: boolean) => {
      setOriginalRaw(raw)
      if (dirty) {
        setOriginalDirty(true)
        setIsRewriteStale((stale) => stale || rewrittenPrompt != null)
        setIsTryOutStale(true)
      }
    },
    [rewrittenPrompt]
  )

  const handleRewrittenChange = useCallback((raw: string, dirty: boolean) => {
    setRewrittenRaw(raw)
    if (dirty) setRewrittenDirty(true)
  }, [])

  function handleNameChange(value: string) {
    setName(value)
    setMetaDirty(true)
  }

  function handleModelChange(value: string) {
    setModel(value)
    setMetaDirty(true)
  }

  async function handleAnalyze() {
    if (!promptId) return
    await updatePrompt.mutateAsync({
      id: promptId,
      data: { raw_prompt: originalRaw, name, model },
    })
    const result = await analyze.mutateAsync(promptId)
    // Suggestions only — applying is the user's click. Already-applied tags
    // don't need re-suggesting.
    setSuggestedTagIds(result.suggested_tag_ids.filter((tid) => !appliedTagIds.includes(tid)))
    setHasAnalyzed(true)
  }

  async function handleRewrite() {
    if (!promptId || appliedTagIds.length === 0) return
    const result = await rewrite.mutateAsync({ id: promptId, tag_ids: appliedTagIds })
    setRewrittenPrompt(result.rewritten_prompt)
    // If the rewritten editor is already mounted (re-rewrite), reset its content;
    // on first rewrite it mounts fresh with this content via initialRaw.
    rewrittenRef.current?.loadFromRaw(result.rewritten_prompt)
    setActiveVersion('rewritten')
    setIsRewriteStale(false)
    await updatePrompt.mutateAsync({
      id: promptId,
      data: {
        rewritten_prompt: result.rewritten_prompt,
        active_version: 'rewritten',
        tag_ids: appliedTagIds,
      },
    })
  }

  // Moves a tag into Applied (from a suggestion click or the "+" dropdown).
  function handleApplyTag(tagId: number) {
    setAppliedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]))
    setSuggestedTagIds((prev) => prev.filter((id) => id !== tagId))
    setMetaDirty(true)
  }

  // Removing never returns the tag to Suggestions — Analyze can re-suggest it.
  function handleRemoveTag(tagId: number) {
    setAppliedTagIds((prev) => prev.filter((id) => id !== tagId))
    setMetaDirty(true)
  }

  const handleTryOut = useCallback(async () => {
    if (!promptId) return
    await updatePrompt.mutateAsync({
      id: promptId,
      data: { raw_prompt: originalRaw, name, model, variables: store.variables },
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
  }, [promptId, originalRaw, name, model, store.variables, updatePrompt])

  function handleVersionChange(version: 'original' | 'rewritten') {
    setActiveVersion(version)
    // Rebuild the editor we're switching to so its inline defaults reflect the
    // latest shared values (defaults edited in the other version, etc.).
    if (version === 'rewritten') {
      rewrittenRef.current?.loadFromRaw(rewrittenRaw || rewrittenPrompt || '')
    } else {
      originalRef.current?.loadFromRaw(originalRaw)
    }
    updatePrompt.mutate({ id: promptId!, data: { active_version: version } })
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const showRewritten = rewrittenPrompt != null && activeVersion === 'rewritten'
  const activeEditorRef = showRewritten ? rewrittenRef : originalRef

  // Gate LLM actions by whether the selected model's provider is connected.
  const connectedProviders = connections.map((c) => c.provider)
  const selectableModels = MODELS.filter((m) => connectedProviders.includes(m.provider))
  const currentInfo = modelInfo(model)
  const modelOptions =
    currentInfo && !selectableModels.some((m) => m.id === model)
      ? [currentInfo, ...selectableModels]
      : selectableModels
  const modelConnected = isModelConnected(model, connectedProviders)

  return (
    <div className="h-full bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-surface shrink-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="flex-1 border-0 text-base font-medium focus-visible:ring-0 px-0"
            placeholder="Prompt name..."
          />
          <ModelSelectorChip
            value={model}
            onChange={handleModelChange}
            options={modelOptions}
            connectedProviders={connectedProviders}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 flex-1 w-full space-y-4 overflow-y-auto">
        {/* Tags */}
        <TagBar
          tags={allTags}
          appliedTagIds={appliedTagIds}
          suggestedTagIds={suggestedTagIds}
          onApply={handleApplyTag}
          onRemove={handleRemoveTag}
          onRewrite={handleRewrite}
          isRewriteLoading={rewrite.isPending}
          isRewriteStale={isRewriteStale}
          showRewrite={hasAnalyzed || appliedTagIds.length > 0}
        />

        {/* Version toggle */}
        {rewrittenPrompt && (
          <VersionToggle activeVersion={activeVersion} onChange={handleVersionChange} />
        )}

        {/* New-variable control (acts on the visible editor) */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => activeEditorRef.current?.newVariable()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            title="Turn the selection into a variable, or insert a new one"
          >
            <Plus className="h-3.5 w-3.5" />
            New variable
          </button>
        </div>

        {/* Prompt editors — both mounted so variables stay in sync; inactive hidden. */}
        <div className={showRewritten ? 'hidden' : undefined}>
          <PromptEditor
            ref={originalRef}
            editorId="original"
            initialRaw={prompt?.raw_prompt ?? ''}
            onChange={handleOriginalChange}
            placeholder="Write your prompt here... Use {{variable}} for dynamic parts."
          />
        </div>
        {rewrittenPrompt != null && (
          <div className={showRewritten ? undefined : 'hidden'}>
            <PromptEditor
              ref={rewrittenRef}
              editorId="rewritten"
              initialRaw={rewrittenPrompt}
              onChange={handleRewrittenChange}
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyze.isPending || !modelConnected}
            className="gap-2"
          >
            {analyze.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasAnalyzed ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {analyze.isPending ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="outline"
            onClick={handleTryOut}
            disabled={isTryOutStreaming || !modelConnected}
            className="gap-2"
          >
            {isTryOutStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Try Out
          </Button>
          {!modelConnected && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Connect a model
            </button>
          )}
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
