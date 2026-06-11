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
      INSERT INTO tags (user_id, name, hint, rewrite_instructions, sort_order)
      SELECT ${userId}, name, hint, rewrite_instructions, sort_order FROM default_tags
      ON CONFLICT (user_id, name) DO NOTHING
    `

    // Remap the template's counter pairs onto the freshly copied tags. Names
    // are the join key (the copy above preserves them); LEAST/GREATEST keeps
    // the canonical lower-id-first order the CHECK constraint requires.
    await tx`
      INSERT INTO tag_counter_tags (tag_id, counter_tag_id)
      SELECT LEAST(ua.id, ub.id), GREATEST(ua.id, ub.id)
      FROM default_tag_counter_tags dc
      JOIN default_tags da ON da.id = dc.tag_id
      JOIN default_tags db ON db.id = dc.counter_tag_id
      JOIN tags ua ON ua.user_id = ${userId} AND ua.name = da.name
      JOIN tags ub ON ub.user_id = ${userId} AND ub.name = db.name
      ON CONFLICT DO NOTHING
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
