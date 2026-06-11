import { Outlet } from 'react-router-dom'
import { NavRail } from './NavRail'
import { OnboardingConnect } from '@/components/OnboardingConnect'

// Persistent icon rail + main content. The rail is narrow enough to stay
// visible at every breakpoint, so there is no mobile drawer.
export function AppShell() {
  return (
    <div className="flex h-screen bg-surface text-foreground">
      <NavRail />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <OnboardingConnect />
    </div>
  )
}
