import { ModelConnections } from '@/components/settings/ModelConnections'

// Keys/account only — tag management lives in the Tags tab.
export function SettingsPage() {
  return (
    <div className="min-h-full bg-surface">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-lg font-medium">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        <ModelConnections />
      </main>
    </div>
  )
}
