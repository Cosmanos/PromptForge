import { Request, Response, NextFunction } from 'express'
import { getProfile } from '../services/provisioning'

// Gates admin-only routes. Runs after requireAuth, so req.userId is set.
// A missing profile row resolves to is_admin=false (never throws), so an
// unprovisioned user is treated as non-admin → 403.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { is_admin } = await getProfile(userId)
  if (!is_admin) return res.status(403).json({ error: 'Admin access required' })

  next()
}
