import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { SegmentEditorState } from './useSegmentEditor'
import { extractVariables } from './useSegmentEditor'

interface AutoSaveOptions {
  promptId: number | undefined
  state: SegmentEditorState
  name: string
  model: string
  rewrittenPrompt: string | null
  activeVersion: 'original' | 'rewritten'
  tagIds: number[]
  onSaved?: () => void
  debounceMs?: number
}

export function useAutoSave({
  promptId,
  state,
  name,
  model,
  rewrittenPrompt,
  activeVersion,
  tagIds,
  onSaved,
  debounceMs = 800,
}: AutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!promptId || !state.isDirty) return

    const payload = JSON.stringify({
      name,
      model,
      raw_prompt: state.rawPrompt,
      rewritten_prompt: rewrittenPrompt,
      active_version: activeVersion,
      tag_ids: tagIds,
      variables: extractVariables(state.segments),
    })

    if (payload === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        await api.prompts.update(promptId, {
          name,
          model,
          raw_prompt: state.rawPrompt,
          rewritten_prompt: rewrittenPrompt ?? undefined,
          active_version: activeVersion,
          tag_ids: tagIds,
          variables: extractVariables(state.segments),
        })
        lastSavedRef.current = payload
        onSaved?.()
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promptId, state.isDirty, state.rawPrompt, name, model, rewrittenPrompt, activeVersion, tagIds, debounceMs, onSaved, state.segments])
}
