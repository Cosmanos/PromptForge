import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Flame } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { OnboardingConnect } from '@/components/OnboardingConnect'

// Persistent left sidebar + main content. Below md, the sidebar collapses into
// a toggleable drawer and the main area goes full width.
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface text-foreground">
      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <Sidebar className="relative z-50 flex h-full" onNavigate={() => setDrawerOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-muted-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Flame className="h-4 w-4" />
          <span className="text-sm font-medium">PromptForge</span>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <OnboardingConnect />
    </div>
  )
}
