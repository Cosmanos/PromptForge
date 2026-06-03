import sql from '../db/database'

// Lazily provisions a user on first authenticated contact: creates their
// profile row and, only the first time, copies the default_tags template into
// their own tags. Idempotent — safe to call on every relevant request. Because
// the copy runs only when the profile is first inserted, deleting an inherited
// tag later never resurrects it.
export async function ensureUserProvisioned(userId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const inserted = await tx`
      INSERT INTO profiles (id) VALUES (${userId})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
    if (inserted.length === 0) return // already provisioned

    await tx`
      INSERT INTO tags (user_id, name, hint, sort_order)
      SELECT ${userId}, name, hint, sort_order FROM default_tags
      ON CONFLICT (user_id, name) DO NOTHING
    `
  })
}

// Returns the profile flags, defaulting is_admin to false when the profile
// row does not yet exist (unprovisioned user).
export async function getProfile(userId: string): Promise<{ is_admin: boolean }> {
  const [row] = await sql<{ is_admin: boolean }[]>`
    SELECT is_admin FROM profiles WHERE id = ${userId}
  `
  return { is_admin: row?.is_admin ?? false }
}
