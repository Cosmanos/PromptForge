import { VariableChip } from './VariableChip'
import type { VariableSegment } from '@/types'

interface VariableExpandedProps {
  segment: VariableSegment
  onRename: (newName: string) => void
  onDelete: () => void
  onToggleExpand: () => void
  onUpdateDefault: (value: string) => void
}

export function VariableExpanded({
  segment,
  onRename,
  onDelete,
  onToggleExpand,
  onUpdateDefault,
}: VariableExpandedProps) {
  const { border, inputBg, text } = segment.color

  return (
    <div className="my-1">
      <VariableChip
        segment={segment}
        onRename={onRename}
        onDelete={onDelete}
        onToggleExpand={onToggleExpand}
      />
      <div
        className="mt-1 ml-2 rounded-md overflow-hidden"
        style={{ borderLeft: `3px solid ${border}` }}
      >
        <div className="px-3 py-2" style={{ backgroundColor: inputBg }}>
          <p className="text-xs font-medium mb-1" style={{ color: text }}>
            Default value for <span className="font-mono">{segment.name}</span>
          </p>
          <textarea
            value={segment.defaultValue}
            onChange={(e) => onUpdateDefault(e.target.value)}
            placeholder={`Enter default value...`}
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60"
            style={{ color: text }}
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
