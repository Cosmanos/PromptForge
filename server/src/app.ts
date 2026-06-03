import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import tagsRouter from './routes/tags'
import promptsRouter from './routes/prompts'
import analyzeRouter from './routes/analyze'
import rewriteRouter from './routes/rewrite'
import tryoutRouter from './routes/tryout'
import sessionsRouter from './routes/sessions'
import { requireAuth } from './middleware/auth'

const app = express()

app.use(cors())
app.use(express.json())

// All /api routes require a valid Supabase access token (verified locally
// against the project JWKS). cors() above handles the OPTIONS preflight, and
// requireAuth no-ops on OPTIONS as a second guard.
app.use('/api', requireAuth)

app.use('/api/tags', tagsRouter)
app.use('/api/prompts', promptsRouter)
app.use('/api/prompts/:id/analyze', analyzeRouter)
app.use('/api/prompts/:id/rewrite', rewriteRouter)
app.use('/api/prompts/:id/tryout', tryoutRouter)
app.use('/api/sessions', sessionsRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

export default app
