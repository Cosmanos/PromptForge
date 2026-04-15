import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import app from './app'
import { runMigrations } from './db/migrations'
import { seedTags } from './db/seed'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

runMigrations()
seedTags()

app.listen(PORT, () => {
  console.log(`🚀 PromptForge server running on http://localhost:${PORT}`)
})
