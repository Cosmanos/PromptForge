import { useState } from 'react'
import { Loader2, Check, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConnections, useSaveKey, useDeleteKey } from '@/hooks/usePrompts'
import { PROVIDER_LABELS, type Provider } from '@/lib/models'
import type { Connection } from '@/types'

const PROVIDERS: Provider[] = ['anthropic', 'openai']

const KEY_PLACEHOLDER: Record<Provider, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
}

export function ModelConnections() {
  const { data: connections = [], isLoading } = useConnections()

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-medium">Model Connections</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bring your own provider keys. Keys are encrypted, used only to run your prompts, and never
          shown again — only the last 4 digits.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ProviderRow
              key={provider}
              provider={provider}
              connection={connections.find((c) => c.provider === provider)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ProviderRow({
  provider,
  connection,
}: {
  provider: Provider
  connection: Connection | undefined
}) {
  const saveKey = useSaveKey()
  const deleteKey = useDeleteKey()
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connected = connection != null
  const showForm = !connected || editing

  async function handleSave() {
    if (!value.trim()) return
    setError(null)
    try {
      await saveKey.mutateAsync({ provider, key: value.trim() })
      setValue('')
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key')
    }
  }

  async function handleRemove() {
    if (!confirm(`Disconnect your ${PROVIDER_LABELS[provider]} key? Prompts using its models won't run until you reconnect.`)) return
    setError(null)
    try {
      await deleteKey.mutateAsync(provider)
      setEditing(false)
      setValue('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove key')
    }
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{PROVIDER_LABELS[provider]}</span>
          {connected && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              Connected · ••••{connection!.last4}
            </span>
          )}
        </div>
        {connected && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={deleteKey.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="flex items-start gap-2">
          <Input
            type="password"
            autoComplete="off"
            placeholder={KEY_PLACEHOLDER[provider]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saveKey.isPending || !value.trim()} className="shrink-0">
            {saveKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? 'Update' : 'Connect'}
          </Button>
          {connected && editing && (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setValue(''); setError(null) }}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
