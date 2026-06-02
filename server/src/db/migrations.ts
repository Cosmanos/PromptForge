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

  console.log('✅ Migrations complete')
}
