import { useCallback, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'

type UpdateData = Parameters<typeof api.prompts.update>[1]

/**
 * Debounced auto-save of a partial prompt update. The caller owns exactly the
 * fields it passes in `data` (so the original and rewritten editors don't
 * clobber each other). Saves only fire while `enabled` is true and skip when
 * the serialized payload hasn't changed since the last successful save.
 *
 * Pending edits also flush immediately on window blur and on unmount
 * (navigate-away), so a draft never loses the tail of what was typed.
 */
export function useAutoSave(
  promptId: number | undefined,
  data: UpdateData,
  enabled: boolean,
  debounceMs = 800
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const payload = JSON.stringify(data)

  // Latest inputs for the flush paths, which run from stable listeners.
  const stateRef = useRef({ promptId, enabled, payload })
  stateRef.current = { promptId, enabled, payload }

  const flush = useCallback(() => {
    const { promptId, enabled, payload } = stateRef.current
    if (!promptId || !enabled || payload === lastSavedRef.current) return
    // Claim the payload up front so concurrent triggers (timer + blur) don't
    // double-fire; restore on failure so the next change retries it.
    const prev = lastSavedRef.current
    lastSavedRef.current = payload
    api.prompts
      .update(promptId, JSON.parse(payload) as UpdateData)
      .then(() => {
        // Keep the sidebar Recent list (and My Prompts) in step with edits.
        queryClient.invalidateQueries({ queryKey: ['prompts', 'recent'] })
        queryClient.invalidateQueries({ queryKey: ['prompts', 'saved'] })
      })
      .catch((err) => {
        lastSavedRef.current = prev
        console.error('Auto-save failed:', err)
      })
  }, [])

  useEffect(() => {
    if (!promptId || !enabled) return
    if (payload === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promptId, enabled, payload, debounceMs, flush])

  useEffect(() => {
    window.addEventListener('blur', flush)
    return () => {
      window.removeEventListener('blur', flush)
      flush()
    }
  }, [flush])
}
