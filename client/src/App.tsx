import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/lib/auth'
import { useMe } from '@/hooks/usePrompts'
import { AuthPage } from '@/pages/AuthPage'
import { HomePage } from '@/pages/HomePage'
import { BuilderPage } from '@/pages/BuilderPage'
import { ExecutionPage } from '@/pages/ExecutionPage'
import { SettingsPage } from '@/pages/SettingsPage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// Renders once /api/me has resolved, which provisions the user (profile + tag
// copy) before any tag query fires — avoiding an empty-tags first paint.
function ProvisionedRoutes() {
  const { isLoading, isError } = useMe()

  if (isLoading && !isError) return <Spinner />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/builder/:id" element={<BuilderPage />} />
        <Route path="/execute/:id" element={<ExecutionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function AuthedApp() {
  const { session, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <AuthPage />

  return <ProvisionedRoutes />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthedApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}
