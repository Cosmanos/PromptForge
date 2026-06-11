import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Flame, Hammer, FileText, Tags, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

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

// Narrow vertical icon rail: logo on top, one icon per top-level section,
// account at the bottom. Each tab swaps the main content area.
export function NavRail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
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
    <nav className="flex w-14 shrink-0 flex-col items-center border-r border-border bg-surface-sidebar py-3">
      {/* Logo mark */}
      <div className="flex h-10 w-10 items-center justify-center" title="PromptForge">
        <Flame className="h-5 w-5 text-foreground" />
      </div>

      {/* Section tabs */}
      <div className="mt-4 flex flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon, match }) => {
          const active = location.pathname.startsWith(match)
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                active
                  ? 'bg-track text-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          )
        })}
      </div>

      {/* Account */}
      <div ref={accountRef} className="relative mt-auto">
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          title={user?.email ?? 'Account'}
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-track text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {(user?.email ?? '?').slice(0, 1).toUpperCase()}
        </button>

        {accountOpen && (
          <div className="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-lg">
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
