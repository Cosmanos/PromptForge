import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelConnections } from '@/components/settings/ModelConnections'
import { useConnections, useMe } from '@/hooks/usePrompts'

// Post-signup "connect models" step. Shows once, when the user has no provider
// keys connected and hasn't dismissed it. Skippable — dismissal is remembered
// per user in localStorage so it never nags again. Users can always connect
// later from Settings.
function dismissKey(userId: string) {
  return `pf_onboarding_dismissed_${userId}`
}

export function OnboardingConnect() {
  const { data: me } = useMe()
  const { data: connections = [], isLoading } = useConnections()
  const userId = me?.user_id
  const [dismissed, setDismissed] = useState(false)

  if (!userId || isLoading) return null
  if (dismissed) return null
  if (connections.length > 0) return null
  if (localStorage.getItem(dismissKey(userId))) return null

  function skip() {
    if (userId) localStorage.setItem(dismissKey(userId), '1')
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 className="text-lg font-semibold">Connect a model</h2>
            <p className="text-sm text-muted-foreground mt-1">
              PromptForge runs on your own provider keys. Add at least one to start analyzing,
              rewriting, and running prompts. You can do this later in Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6">
          <ModelConnections />
        </div>

        <div className="flex justify-end p-6 pt-4">
          <Button variant="ghost" onClick={skip}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}
