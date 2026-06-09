import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

// Track-backed segmented control. Active segment = dark --accent fill, white
// text. Used for Build/Use and Original/Rewritten.
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedToggleProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-track p-[3px]',
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
