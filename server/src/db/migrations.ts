import db from './database'

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      hint       TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL DEFAULT 'Untitled Prompt',
      raw_prompt       TEXT NOT NULL DEFAULT '',
      rewritten_prompt TEXT,
      active_version   TEXT NOT NULL DEFAULT 'original',
      model            TEXT NOT NULL DEFAULT 'gpt-4o',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS variables (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id     INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      default_value TEXT NOT NULL DEFAULT '',
      color         TEXT NOT NULL DEFAULT '{}',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(prompt_id, name)
    );

    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      tag_id    INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (prompt_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id        INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      variable_values  TEXT NOT NULL DEFAULT '{}',
      compiled_prompt  TEXT NOT NULL,
      model            TEXT NOT NULL,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  console.log('✅ Migrations complete')
}
