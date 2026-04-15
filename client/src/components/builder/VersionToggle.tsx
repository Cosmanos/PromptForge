import { cn } from '@/lib/utils'

interface VersionToggleProps {
  activeVersion: 'original' | 'rewritten'
  onChange: (version: 'original' | 'rewritten') => void
}

export function VersionToggle({ activeVersion, onChange }: VersionToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
      <button
        onClick={() => onChange('original')}
        className={cn(
          'px-3 py-1.5 font-medium transition-colors',
          activeVersion === 'original'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
      >
        Original
      </button>
      <button
        onClick={() => onChange('rewritten')}
        className={cn(
          'px-3 py-1.5 font-medium transition-colors border-l border-border',
          activeVersion === 'rewritten'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
      >
        Rewritten
      </button>
    </div>
  )
}
