import { useState } from 'react'
import { Hammer, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        // With "Confirm email" enabled, sign-up returns a user but no session.
        // Do not route into the app — prompt the user to verify their email.
        if (!data.session) {
          setCheckEmail(true)
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // On success the AuthProvider's onAuthStateChange swaps the app in.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  if (checkEmail) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <Mail className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to
            verify your account, then sign in.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setCheckEmail(false)
              setMode('signin')
              setPassword('')
            }}
          >
            Back to sign in
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">
            {mode === 'signin' ? 'Sign in to PromptForge' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Welcome back. Sign in to continue.'
              : 'Sign up with email — you’ll confirm your address before signing in.'}
          </p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full gap-2" onClick={() => handleOAuth('google')}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => handleOAuth('github')}>
            Continue with GitHub
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => {
              setError(null)
              setMode(mode === 'signin' ? 'signup' : 'signin')
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-6">
        <Hammer className="h-6 w-6 text-primary" />
        <span className="text-xl font-semibold">PromptForge</span>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  )
}
