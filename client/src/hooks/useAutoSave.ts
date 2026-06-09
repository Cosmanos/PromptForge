import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'

type UpdateData = Parameters<typeof api.prompts.update>[1]

/**
 * Debounced auto-save of a partial prompt update. The caller owns exactly the
 * fields it passes in `data` (so the original and rewritten editors don't
 * clobber each other). Saves only fire while `enabled` is true and skip when
 * the serialized payload hasn't changed since the last successful save.
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

  useEffect(() => {
    if (!promptId || !enabled) return
    if (payload === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await api.prompts.update(promptId, JSON.parse(payload) as UpdateData)
        lastSavedRef.current = payload
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promptId, enabled, payload, debounceMs])
}
