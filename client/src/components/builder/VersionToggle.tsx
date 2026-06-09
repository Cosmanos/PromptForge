import { SegmentedToggle } from '@/components/ui/SegmentedToggle'

interface VersionToggleProps {
  activeVersion: 'original' | 'rewritten'
  onChange: (version: 'original' | 'rewritten') => void
}

export function VersionToggle({ activeVersion, onChange }: VersionToggleProps) {
  return (
    <SegmentedToggle<'original' | 'rewritten'>
      size="sm"
      value={activeVersion}
      onChange={onChange}
      options={[
        { value: 'original', label: 'Original' },
        { value: 'rewritten', label: 'Rewritten' },
      ]}
    />
  )
}
