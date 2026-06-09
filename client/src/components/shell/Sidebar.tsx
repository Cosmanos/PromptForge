import { useLocation, useNavigate, useMatch } from 'react-router-dom'
import { Flame, Plus, FileText, Settings, LogOut, Hammer, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { useAuth } from '@/lib/auth'
import { usePromptList } from '@/hooks/usePrompts'

type Mode = 'build' | 'use'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  // Sidebar renders in the layout route (above the Outlet), so useParams() is
  // empty here — match the path directly to find the open prompt.
  const buildMatch = useMatch('/build/:id')
  const { user, signOut } = useAuth()
  const { data: prompts = [] } = usePromptList()

  const mode: Mode = location.pathname.startsWith('/use') ? 'use' : 'build'
  const activeId = buildMatch?.params.id ? Number(buildMatch.params.id) : undefined

  function go(path: string) {
    navigate(path)
    onNavigate?.()
  }

  function handleMode(next: Mode) {
    go(next === 'build' ? '/build' : '/use')
  }

  const recent = [...prompts].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  return (
    <aside
      className={cn(
        'flex w-60 shrink-0 flex-col border-r border-border bg-surface-sidebar',
        className
      )}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-2 px-4 py-4">
        <Flame className="h-5 w-5 text-foreground" />
        <span className="text-base font-medium">PromptForge</span>
      </div>

      {/* Mode toggle */}
      <div className="px-3">
        <SegmentedToggle<Mode>
          className="w-full [&>button]:flex-1"
          value={mode}
          onChange={handleMode}
          options={[
            { value: 'build', label: 'Build', icon: <Hammer className="h-3.5 w-3.5" /> },
            { value: 'use', label: 'Use', icon: <Play className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      {/* New prompt */}
      <div className="px-3 pt-3">
        <Button className="w-full justify-start gap-2" onClick={() => go('/build')}>
          <Plus className="h-4 w-4" />
          New prompt
        </Button>
      </div>

      {/* Recent prompts */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-tertiary">
          Recent
        </p>
        <div className="space-y-0.5">
          {recent.length === 0 && (
            <p className="px-2 py-1 text-xs text-tertiary">No prompts yet.</p>
          )}
          {recent.map((p) => {
            const active = activeId === p.id && mode === 'build'
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => go(`/build/${p.id}`)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                )}
              >
                <FileText className="h-4 w-4 shrink-0 text-tertiary" />
                <span className="truncate">{p.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Account */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-track text-xs font-medium text-muted-foreground">
            {(user?.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {user?.email ?? 'Account'}
          </span>
        </div>
        <div className="mt-1 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 text-muted-foreground"
            onClick={() => go('/settings')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => signOut()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
