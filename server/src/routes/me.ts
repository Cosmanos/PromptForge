import { Router, Request, Response } from 'express'
import { ensureUserProvisioned, getProfile } from '../services/provisioning'

const router = Router()

// GET /api/me — provisions the user on first contact (profile + tag copy) and
// returns their identity + admin flag. The client calls this before firing
// tag queries, so provisioning is guaranteed done by then.
router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!
  await ensureUserProvisioned(userId)
  const { is_admin } = await getProfile(userId)
  res.json({ user_id: userId, is_admin })
})

export default router
