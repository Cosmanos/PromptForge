import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { OnboardingConnect } from '@/components/OnboardingConnect'

// Persistent labeled sidebar (sections + Recent + account) + main content.
export function AppShell() {
  return (
    <div className="flex h-screen bg-surface text-foreground">
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <OnboardingConnect />
    </div>
  )
}
