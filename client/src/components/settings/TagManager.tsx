import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface TagItem {
  id: number
  name: string
  hint: string
  sort_order: number
}

interface TagManagerProps {
  title: string
  description?: string
  tags: TagItem[]
  isLoading: boolean
  onCreate: (data: { name: string; hint: string }) => Promise<unknown>
  onUpdate: (id: number, data: { name: string; hint: string }) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
  deleteWarning: string
}

export function TagManager({
  title,
  description,
  tags,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: TagManagerProps) {
  const [newName, setNewName] = useState('')
  const [newHint, setNewHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onCreate({ name: newName.trim(), hint: newHint.trim() })
      setNewName('')
      setNewHint('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onUpdate={onUpdate}
              onDelete={onDelete}
              deleteWarning={deleteWarning}
            />
          ))}

          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          )}

          {/* Add new */}
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <div className="flex-1 grid gap-2">
              <Input
                placeholder="New tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Hint (instruction woven into the prompt)"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={busy || !newName.trim()} className="gap-1.5 shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function TagRow({
  tag,
  onUpdate,
  onDelete,
  deleteWarning,
}: {
  tag: TagItem
  onUpdate: (id: number, data: { name: string; hint: string }) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
  deleteWarning: string
}) {
  const [name, setName] = useState(tag.name)
  const [hint, setHint] = useState(tag.hint)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = name !== tag.name || hint !== tag.hint

  async function handleSave() {
    if (!dirty || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onUpdate(tag.id, { name: name.trim(), hint: hint.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm(deleteWarning)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(tag.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
      setBusy(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Input value={hint} onChange={(e) => setHint(e.target.value)} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={busy} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
