import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Flame, Hammer, FileText, Tags, Settings, LogOut } from 'lucide-react'
import { cn, displayTitle } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useRecentPrompts } from '@/hooks/usePrompts'

interface NavItem {
  path: string
  label: string
  icon: typeof Hammer
  // Prefix that marks this tab active (e.g. /build matches /build/:id too).
  match: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/build', label: 'Build', icon: Hammer, match: '/build' },
  { path: '/prompts', label: 'Prompts', icon: FileText, match: '/prompts' },
  { path: '/tags', label: 'Tags', icon: Tags, match: '/tags' },
  { path: '/settings', label: 'Settings', icon: Settings, match: '/settings' },
]

// Labeled sidebar (supersedes the icon rail): section nav on top, a Recent
// list of recently touched prompts (drafts + saved) in the middle, account at
// the bottom. Recent is the scratchpad view — drafts live here and in no
// other list, auto-titled from their content.
export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { data: recent = [] } = useRecentPrompts()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [accountOpen])

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <Flame className="h-5 w-5 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">PromptForge</span>
      </div>

      {/* Section nav */}
      <div className="flex flex-col gap-0.5 px-2 pt-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon, match }) => {
          const active = location.pathname.startsWith(match)
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-track text-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Recent — recently touched prompts, most recent first */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <p className="px-4 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-tertiary">
          Recent
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {recent.length === 0 ? (
            <p className="px-2.5 py-1.5 text-xs text-tertiary">No prompts yet</p>
          ) : (
            recent.map((p) => {
              const active = location.pathname === `/build/${p.id}`
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/build/${p.id}`)}
                  title={displayTitle(p)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-track text-foreground'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{displayTitle(p)}</span>
                  {!p.is_saved && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary"
                      title="Draft"
                      aria-label="Draft"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Account */}
      <div ref={accountRef} className="relative border-t border-border p-2">
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-track text-xs font-medium text-muted-foreground">
            {(user?.email ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {user?.email ?? 'Account'}
          </span>
        </button>

        {accountOpen && (
          <div className="absolute bottom-full left-2 z-50 mb-1 w-52 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">
              {user?.email ?? 'Account'}
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
