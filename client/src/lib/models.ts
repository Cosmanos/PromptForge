// Mirrors server/src/services/models.ts — keep the two in sync. The frontend
// uses this to populate the model selector and to gate actions by whether the
// selected model's provider is connected.

export type Provider = 'anthropic' | 'openai'

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

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}

const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]))

export function modelInfo(id: string): ModelInfo | undefined {
  return MODEL_BY_ID.get(id)
}

export function providerForModel(id: string): Provider | undefined {
  return MODEL_BY_ID.get(id)?.provider
}

// A model is usable when its provider is among the user's connected providers.
export function isModelConnected(modelId: string, connectedProviders: Provider[]): boolean {
  const provider = providerForModel(modelId)
  return provider != null && connectedProviders.includes(provider)
}
