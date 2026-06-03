import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagManager } from '@/components/settings/TagManager'
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

export function SettingsPage() {
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        <TagManager
          title="My Tags"
          description="Tags shape how your prompts are rewritten. Edit, add, or remove them freely."
          tags={tags}
          isLoading={tagsLoading}
          onCreate={(d) => createTag.mutateAsync(d)}
          onUpdate={(id, d) => updateTag.mutateAsync({ id, data: d })}
          onDelete={(id) => deleteTag.mutateAsync(id)}
          deleteWarning="Delete this tag? It will be removed from your account and unselected from any prompts using it. This cannot be undone."
        />

        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Admin</span>
            </div>
            <TagManager
              title="Default Tags (template)"
              description="The starter set copied into each new account at signup. Editing these does NOT change existing users' tags — only future signups."
              tags={defaultTags}
              isLoading={defaultsLoading}
              onCreate={(d) => createDefault.mutateAsync(d)}
              onUpdate={(id, d) => updateDefault.mutateAsync({ id, data: d })}
              onDelete={(id) => deleteDefault.mutateAsync(id)}
              deleteWarning="Delete this default tag? New signups will no longer receive it. Existing users keep their copy."
            />
          </div>
        )}
      </main>
    </div>
  )
}
