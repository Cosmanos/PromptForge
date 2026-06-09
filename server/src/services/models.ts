// Single source of truth for which models exist and which provider serves each.
// The frontend mirrors this list in client/src/lib/models.ts — keep them in sync.

export type Provider = 'anthropic' | 'openai'

export const PROVIDERS: Provider[] = ['anthropic', 'openai']

export interface ModelInfo {
  id: string
  label: string
  provider: Provider
}

export const MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
]

const PROVIDER_BY_MODEL = new Map(MODELS.map((m) => [m.id, m.provider]))

// Resolve a model id to its provider. Throws on an unknown model rather than
// silently defaulting — an unknown model means a bad request or stale data, and
// guessing the provider would route the wrong key.
export function providerForModel(model: string): Provider {
  const provider = PROVIDER_BY_MODEL.get(model)
  if (!provider) {
    throw new Error(`Unknown model: ${model}`)
  }
  return provider
}
