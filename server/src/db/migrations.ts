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

  // ---- Part 3: per-user tags + admin template ----
  // default_tags is the admin-maintained seed; profiles holds the is_admin flag.
  await sql`
    CREATE TABLE IF NOT EXISTS default_tags (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      hint       TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id         UUID PRIMARY KEY,
      is_admin   BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  // Make tags per-user. Add the column first so the one-time move below can
  // target the original global rows (user_id IS NULL).
  await sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id UUID`

  // One-time move: the current global tags become the admin template seed.
  await sql`
    INSERT INTO default_tags (name, hint, sort_order)
    SELECT name, hint, sort_order FROM tags WHERE user_id IS NULL
    ON CONFLICT (name) DO NOTHING
  `
  // Drop the now-moved global rows; per-user copies are created at provisioning.
  await sql`DELETE FROM tags WHERE user_id IS NULL`
  await sql`ALTER TABLE tags ALTER COLUMN user_id SET NOT NULL`

  // Replace the old global UNIQUE(name) with a per-user UNIQUE(user_id, name).
  // Drop any unique constraint on tags by query so we don't depend on its
  // auto-generated name, then add the per-user one if absent. Idempotent.
  await sql`
    DO $$
    DECLARE c text;
    BEGIN
      FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'tags'::regclass AND contype = 'u'
          AND conname <> 'tags_user_id_name_key'
      LOOP
        EXECUTE 'ALTER TABLE tags DROP CONSTRAINT ' || quote_ident(c);
      END LOOP;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tags_user_id_name_key'
      ) THEN
        ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);
      END IF;
    END $$
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)`

  // ---- Part 4: per-user encrypted provider API keys ----
  // One key per user per provider. The plaintext key never lands here: only the
  // AES-256-GCM ciphertext + iv + auth_tag, plus last4 for display. Decryption
  // happens server-side at call time only. UNIQUE(user_id, provider) makes
  // "replace a key" a clean upsert.
  await sql`
    CREATE TABLE IF NOT EXISTS provider_credentials (
      id         BIGSERIAL PRIMARY KEY,
      user_id    UUID NOT NULL,
      provider   TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
      ciphertext TEXT NOT NULL,
      iv         TEXT NOT NULL,
      auth_tag   TEXT NOT NULL,
      last4      TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_provider_credentials_user_id ON provider_credentials(user_id)`

  console.log('✅ Migrations complete')
}
