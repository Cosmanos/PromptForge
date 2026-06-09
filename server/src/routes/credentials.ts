import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { listConnections, saveKey, deleteKey } from '../services/credentials'
import { PROVIDERS, Provider } from '../services/models'

const router = Router()

const ProviderParam = z.enum(['anthropic', 'openai'])

const SaveKeySchema = z.object({
  // Minimal validation: non-empty, trimmed. We never echo it back, and the
  // real check is whether the provider accepts it at call time.
  key: z.string().trim().min(8, 'API key looks too short'),
})

// GET /api/credentials — the caller's connected providers. Returns only
// { provider, last4, created_at } — never any key material.
router.get('/', async (req: Request, res: Response) => {
  const connections = await listConnections(req.userId!)
  res.json(connections)
})

// PUT /api/credentials/:provider — add or replace the key for one provider.
router.put('/:provider', async (req: Request, res: Response) => {
  const parsedProvider = ProviderParam.safeParse(req.params.provider)
  if (!parsedProvider.success) {
    return res.status(400).json({ error: `Unknown provider; expected one of ${PROVIDERS.join(', ')}` })
  }

  const parsed = SaveKeySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const connection = await saveKey(req.userId!, parsedProvider.data as Provider, parsed.data.key)
  res.json(connection)
})

// DELETE /api/credentials/:provider — disconnect a provider.
router.delete('/:provider', async (req: Request, res: Response) => {
  const parsedProvider = ProviderParam.safeParse(req.params.provider)
  if (!parsedProvider.success) {
    return res.status(400).json({ error: `Unknown provider; expected one of ${PROVIDERS.join(', ')}` })
  }

  const removed = await deleteKey(req.userId!, parsedProvider.data as Provider)
  if (!removed) return res.status(404).json({ error: 'No key connected for that provider' })
  res.status(204).send()
})

export default router
