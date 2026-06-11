import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  Search,
  Shield,
  Trash2,
  Loader2,
  X,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TagInput } from '@/lib/api'
import {
  useMe,
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useDefaultTags,
  useCreateDefaultTag,
  useUpdateDefaultTag,
  useDeleteDefaultTag,
} from '@/hooks/usePrompts'

// Common shape of Tag and DefaultTag, everything the editor touches.
interface TagLike {
  id: number
  name: string
  hint: string
  rewrite_instructions: string
  sort_order: number
  counter_tag_ids: number[]
}

export function TagsPage() {
  const { data: me } = useMe()
  const isAdmin = me?.is_admin ?? false

  const { data: tags = [], isLoading: tagsLoading } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const { data: defaultTags = [], isLoading: defaultsLoading } = useDefaultTags(isAdmin)
  const createDefault = useCreateDefaultTag()
  const updateDefault = useUpdateDefaultTag()
  const deleteDefault = useDeleteDefaultTag()

  return (
    <div className="min-h-full bg-surface">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-lg font-medium">Tags</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-12">
        <TagCollection
          description="Tags shape how your prompts are analyzed and rewritten. 'Applies when' tells Analyze when to suggest a tag; 'Rewrite' is what gets woven into your prompt."
          tags={tags}
          isLoading={tagsLoading}
          onCreate={(d) => createTag.mutateAsync(d)}
          onUpdate={(id, d) => updateTag.mutateAsync({ id, data: d })}
          onDelete={(id) => deleteTag.mutateAsync(id)}
          deleteWarning="Delete this tag? It will be removed from your account and from any prompts using it. This cannot be undone."
        />

        {isAdmin && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-[0.05em]">
                Admin — Default tags (template)
              </span>
            </div>
            <TagCollection
              description="The starter set copied into each new account at signup. Editing these does NOT change existing users' tags — only future signups."
              tags={defaultTags}
              isLoading={defaultsLoading}
              onCreate={(d) => createDefault.mutateAsync(d)}
              onUpdate={(id, d) => updateDefault.mutateAsync({ id, data: d })}
              onDelete={(id) => deleteDefault.mutateAsync(id)}
              deleteWarning="Delete this default tag? New signups will no longer receive it. Existing users keep their copy."
            />
          </section>
        )}
      </main>
    </div>
  )
}

// ---- Collection (list + search + new + inline editors) ----

interface TagCollectionProps {
  description: string
  tags: TagLike[]
  isLoading: boolean
  onCreate: (data: TagInput) => Promise<unknown>
  onUpdate: (id: number, data: Partial<TagInput>) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
  deleteWarning: string
}

function TagCollection({
  description,
  tags,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: TagCollectionProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? tags.filter(
        (t) => t.name.toLowerCase().includes(q) || t.hint.toLowerCase().includes(q)
      )
    : tags

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="pl-8"
          />
        </div>
        <Button onClick={() => setCreating(true)} disabled={creating} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          New tag
        </Button>
      </div>

      {creating && (
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <TagEditor
            allTags={tags}
            onSave={async (data) => {
              await onCreate(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="divide-y divide-border-subtle rounded-lg border border-border">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {tags.length === 0 ? 'No tags yet.' : 'No tags match your search.'}
            </p>
          )}
          {filtered.map((tag) =>
            expandedId === tag.id ? (
              <div key={tag.id} className="bg-surface-muted p-4">
                <TagEditor
                  tag={tag}
                  allTags={tags}
                  onSave={async (data) => {
                    await onUpdate(tag.id, data)
                    setExpandedId(null)
                  }}
                  onCancel={() => setExpandedId(null)}
                  onDelete={async () => {
                    if (!confirm(deleteWarning)) return
                    await onDelete(tag.id)
                    setExpandedId(null)
                  }}
                />
              </div>
            ) : (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setExpandedId(tag.id)
                  setCreating(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="shrink-0 text-sm font-medium">{tag.name}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {tag.hint}
                </span>
                {tag.counter_tag_ids.length > 0 && (
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs text-tertiary"
                    title={`Counters ${tag.counter_tag_ids.length} tag${tag.counter_tag_ids.length !== 1 ? 's' : ''}`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    {tag.counter_tag_ids.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 text-tertiary" />
              </button>
            )
          )}
        </div>
      )}
    </section>
  )
}

// ---- Editor (all four fields) ----

interface TagEditorProps {
  tag?: TagLike // undefined = creating
  allTags: TagLike[]
  onSave: (data: TagInput) => Promise<unknown>
  onCancel: () => void
  onDelete?: () => Promise<unknown>
}

function TagEditor({ tag, allTags, onSave, onCancel, onDelete }: TagEditorProps) {
  const [name, setName] = useState(tag?.name ?? '')
  const [hint, setHint] = useState(tag?.hint ?? '')
  const [rewrite, setRewrite] = useState(tag?.rewrite_instructions ?? '')
  const [counterIds, setCounterIds] = useState<number[]>(tag?.counter_tag_ids ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counterCandidates = allTags.filter((t) => t.id !== tag?.id && !counterIds.includes(t.id))
  const counters = counterIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is TagLike => t != null)

  async function handleSave() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        hint: hint.trim(),
        rewrite_instructions: rewrite.trim(),
        counter_tag_ids: counterIds,
        ...(tag ? {} : { sort_order: allTags.length }),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tag')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
      setBusy(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tag')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Be Concise"
          autoFocus={!tag}
        />
      </Field>

      <Field label="Applies when" hint="Analyze suggests this tag when the prompt matches this.">
        <Textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={2}
          placeholder="When should this tag be suggested?"
        />
      </Field>

      <Field label="Rewrite" hint="Woven into the prompt when this tag is applied at rewrite.">
        <Textarea
          value={rewrite}
          onChange={(e) => setRewrite(e.target.value)}
          rows={2}
          placeholder="Instruction to embed into the prompt..."
        />
      </Field>

      <Field
        label="Counter-tags"
        hint="Works both ways: applying this tag together with a counter-tag shows a warning — it never blocks."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {counters.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs"
            >
              {c.name}
              <button
                type="button"
                onClick={() => setCounterIds((ids) => ids.filter((id) => id !== c.id))}
                className="text-tertiary hover:text-foreground"
                aria-label={`Remove counter-tag ${c.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCounterDropdown
            candidates={counterCandidates}
            onAdd={(id) => setCounterIds((ids) => [...ids, id])}
          />
        </div>
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={handleSave} disabled={busy || !name.trim()} size="sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : tag ? 'Save' : 'Create'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto gap-1.5 text-danger hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-tertiary">{hint}</p>}
    </div>
  )
}

// Small searchable picker for adding a counter-tag.
function AddCounterDropdown({
  candidates,
  onAdd,
}: {
  candidates: TagLike[]
  onAdd: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const q = filter.trim().toLowerCase()
  const shown = q ? candidates.filter((t) => t.name.toLowerCase().includes(q)) : candidates

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setFilter('')
        }}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags..."
            className="mb-1.5 h-8 text-xs"
            autoFocus
          />
          <div className="max-h-44 overflow-y-auto">
            {shown.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-tertiary">No tags found.</p>
            )}
            {shown.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onAdd(t.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm',
                  'text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground'
                )}
              >
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
