import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { SearchBar } from '@/components/home/SearchBar'
import { PromptGrid } from '@/components/home/PromptGrid'
import { usePromptList, useDeletePrompt } from '@/hooks/usePrompts'

export function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: prompts = [], isLoading } = usePromptList()
  const deletePrompt = useDeletePrompt()

  const filtered = prompts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleNew() {
    navigate('/builder/new')
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this prompt?')) return
    await deletePrompt.mutateAsync(id)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Hammer className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">PromptForge</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">My Prompts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-lg border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <PromptGrid
            prompts={filtered}
            onNew={handleNew}
            onExecute={(id) => navigate(`/execute/${id}`)}
            onEdit={(id) => navigate(`/builder/${id}`)}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  )
}
