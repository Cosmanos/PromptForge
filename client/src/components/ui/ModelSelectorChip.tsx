import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODELS, modelInfo, type ModelInfo, type Provider } from '@/lib/models'

interface ModelSelectorChipProps {
  value: string
  onChange: (value: string) => void
  // Which models to offer (defaults to all). The current value is always shown.
  options?: ModelInfo[]
  connectedProviders?: Provider[]
  className?: string
}

// Bordered pill: small provider dot (green = connected) + mono model name +
// chevron. A transparent native <select> sits on top to drive selection.
export function ModelSelectorChip({
  value,
  onChange,
  options = MODELS,
  connectedProviders = [],
  className,
}: ModelSelectorChipProps) {
  const current = modelInfo(value)
  const connected = current ? connectedProviders.includes(current.provider) : false

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs',
        className
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-success' : 'bg-tertiary')}
        aria-hidden
      />
      <span className="font-mono text-foreground">{current?.label ?? value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-tertiary" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Model"
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {connectedProviders.includes(m.provider) ? '' : ' (not connected)'}
          </option>
        ))}
      </select>
    </div>
  )
}
