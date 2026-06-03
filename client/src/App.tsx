import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AuthPage } from '@/pages/AuthPage'
import { HomePage } from '@/pages/HomePage'
import { BuilderPage } from '@/pages/BuilderPage'
import { ExecutionPage } from '@/pages/ExecutionPage'

function AuthedApp() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/builder/:id" element={<BuilderPage />} />
        <Route path="/execute/:id" element={<ExecutionPage />} />
      </Routes>
    </BrowserRouter>
  )
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
