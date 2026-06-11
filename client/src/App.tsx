import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/lib/auth'
import { useMe } from '@/hooks/usePrompts'
import { AppShell } from '@/components/shell/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { HomePage } from '@/pages/HomePage'
import { BuilderPage } from '@/pages/BuilderPage'
import { ExecutionPage } from '@/pages/ExecutionPage'
import { TagsPage } from '@/pages/TagsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// Remount the builder when switching prompts so it re-seeds from the param.
// For an existing prompt, key on the id (stable across re-renders). For a new
// prompt (no id), key on location.key so each "New prompt" navigation forces a
// fresh editor — even after a lazy-create replaceState left the router on
// /build — without remounting mid-typing (replaceState doesn't change the key).
function BuilderRoute() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  return <BuilderPage key={id ?? location.key} />
}

// Renders once /api/me has resolved, which provisions the user (profile + tag
// copy) before any tag query fires — avoiding an empty-tags first paint.
function ProvisionedRoutes() {
  const { isLoading, isError } = useMe()

  if (isLoading && !isError) return <Spinner />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/build" element={<BuilderRoute />} />
          <Route path="/build/:id" element={<BuilderRoute />} />
          <Route path="/prompts" element={<HomePage />} />
          <Route path="/prompts/:id/run" element={<ExecutionPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/build" replace />} />
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

// Dev-only isolated harness for the inline variable editor, reachable without
// auth at /var-demo. Code-split so it never lands in the production bundle.
const VariableEditorDemo = lazy(() => import('@/pages/VariableEditorDemo'))

export default function App() {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/var-demo'
  ) {
    return (
      <Suspense fallback={<Spinner />}>
        <VariableEditorDemo />
      </Suspense>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthedApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}
