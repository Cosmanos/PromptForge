import sql from '../db/database'

// Unsaved drafts (is_saved = false) are working copies, not the library, so
// they expire: untouched drafts go after DRAFT_RETENTION_DAYS, and drafts
// whose content was emptied out go quickly — an empty draft should never have
// persisted in the first place. Saved prompts are never purged.
export const DRAFT_RETENTION_DAYS = 30
export const EMPTY_DRAFT_RETENTION_HOURS = 24

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000 // re-check a few times a day

export async function purgeStaleDrafts(): Promise<void> {
  const stale = await sql`
    DELETE FROM prompts
    WHERE is_saved = false
      AND updated_at < NOW() - make_interval(days => ${DRAFT_RETENTION_DAYS})
    RETURNING id
  `
  const empty = await sql`
    DELETE FROM prompts
    WHERE is_saved = false
      AND btrim(raw_prompt) = ''
      AND updated_at < NOW() - make_interval(hours => ${EMPTY_DRAFT_RETENTION_HOURS})
    RETURNING id
  `
  const purged = stale.length + empty.length
  if (purged > 0) console.log(`🧹 Purged ${purged} stale draft(s)`)
}

// Run once at boot, then on an interval. unref() keeps the timer from holding
// the process open (matters for tests importing the app).
export function scheduleDraftPurge(): void {
  purgeStaleDrafts().catch((err) => console.error('Draft purge failed:', err))
  setInterval(() => {
    purgeStaleDrafts().catch((err) => console.error('Draft purge failed:', err))
  }, PURGE_INTERVAL_MS).unref()
}
