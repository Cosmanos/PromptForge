import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// The Express API verifies Supabase access tokens locally against the project's
// JWKS (asymmetric ES256). No per-request call to the Auth server is made.

const SUPABASE_URL = process.env.SUPABASE_URL
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL env var is required for auth middleware')
}

const ISSUER = `${SUPABASE_URL}/auth/v1`
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`))

// Augment Express Request with the authenticated user id.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // CORS preflight requests carry no Authorization header — let them through
  // so the cors middleware can respond before auth runs.
  if (req.method === 'OPTIONS') return next()

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' })
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: 'authenticated',
    })

    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token: missing subject' })
    }

    req.userId = payload.sub
    next()
  } catch (err) {
    // Log the reason server-side so a valid login that unexpectedly 401s is
    // diagnosable (e.g. issuer/audience claim mismatch vs. bad signature).
    console.warn('Auth token verification failed:', err instanceof Error ? err.message : err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
