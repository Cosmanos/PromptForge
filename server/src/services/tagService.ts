import sql from '../db/database'
import { Tag } from '../types'

export async function getAllTags(userId: string): Promise<Tag[]> {
  return await sql<Tag[]>`SELECT * FROM tags WHERE user_id = ${userId} ORDER BY sort_order`
}

export async function getTagsByIds(ids: number[], userId: string): Promise<Tag[]> {
  if (ids.length === 0) return []
  return await sql<Tag[]>`
    SELECT * FROM tags WHERE id = ANY(${ids}) AND user_id = ${userId} ORDER BY sort_order
  `
}

// Counter-pair reads for all of a user's tags, expanded to a per-tag id list.
// Pairs are stored once in canonical order; both tags in a pair always belong
// to the same user (enforced on write), so joining one side suffices.
export async function getCounterMap(userId: string): Promise<Map<number, number[]>> {
  const pairs = await sql<{ tag_id: string; counter_tag_id: string }[]>`
    SELECT c.tag_id, c.counter_tag_id
    FROM tag_counter_tags c
    JOIN tags t ON t.id = c.tag_id
    WHERE t.user_id = ${userId}
  `
  const map = new Map<number, number[]>()
  for (const p of pairs) {
    const a = Number(p.tag_id)
    const b = Number(p.counter_tag_id)
    map.set(a, [...(map.get(a) ?? []), b])
    map.set(b, [...(map.get(b) ?? []), a])
  }
  return map
}

// Analyze sees the applies-when text (the `hint` column) for each candidate.
export function buildTagListForPrompt(tags: Tag[]): string {
  return tags.map((t) => `id:${t.id} name:"${t.name}" applies_when:"${t.hint}"`).join('\n')
}

// Rewrite consumes the applied tags' rewrite instructions. Tags created
// without one fall back to their applies-when text so they still contribute.
export function buildRewriteInstructions(tags: Tag[]): string {
  return tags.map((t) => `- ${t.name}: ${t.rewrite_instructions || t.hint}`).join('\n')
}
