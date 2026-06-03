import sql from './database'

export async function runMigrations(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      hint       TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS prompts (
      id               BIGSERIAL PRIMARY KEY,
      name             TEXT NOT NULL DEFAULT 'Untitled Prompt',
      raw_prompt       TEXT NOT NULL DEFAULT '',
      rewritten_prompt TEXT,
      active_version   TEXT NOT NULL DEFAULT 'original',
      model            TEXT NOT NULL DEFAULT 'gpt-4o',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS variables (
      id            BIGSERIAL PRIMARY KEY,
      prompt_id     BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      default_value TEXT NOT NULL DEFAULT '',
      color         TEXT NOT NULL DEFAULT '{}',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(prompt_id, name)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      tag_id    BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (prompt_id, tag_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id              BIGSERIAL PRIMARY KEY,
      prompt_id       BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      variable_values TEXT NOT NULL DEFAULT '{}',
      compiled_prompt TEXT NOT NULL,
      model           TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id         BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  // ---- Part 2: per-user ownership ----
  // Direct ownership on top-level tables. variables/prompt_tags/messages stay
  // unscoped at the DB level and inherit ownership through their parent.
  // (No FK to auth.users: enforcement is in the API query layer, not the DB.)
  await sql`ALTER TABLE prompts  ADD COLUMN IF NOT EXISTS user_id UUID`
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID`

  // One-time fresh start: wipe legacy rows that predate ownership. New rows
  // always carry user_id, so on every later boot this matches nothing.
  // Deleting a prompt cascades to its variables, prompt_tags, sessions, messages.
  await sql`DELETE FROM prompts  WHERE user_id IS NULL`
  await sql`DELETE FROM sessions WHERE user_id IS NULL`

  await sql`ALTER TABLE prompts  ALTER COLUMN user_id SET NOT NULL`
  await sql`ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL`

  await sql`CREATE INDEX IF NOT EXISTS idx_prompts_user_id  ON prompts(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`

  console.log('✅ Migrations complete')
}
