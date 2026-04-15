import db from '../db/database'
import { Tag } from '../types'

export function getAllTags(): Tag[] {
  return db.prepare('SELECT * FROM tags ORDER BY sort_order').all() as Tag[]
}

export function getTagsByIds(ids: number[]): Tag[] {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  return db
    .prepare(`SELECT * FROM tags WHERE id IN (${placeholders}) ORDER BY sort_order`)
    .all(...ids) as Tag[]
}

export function buildTagListForPrompt(tags: Tag[]): string {
  return tags.map((t) => `id:${t.id} name:"${t.name}" hint:"${t.hint}"`).join('\n')
}

export function buildTagHintsForRewrite(tags: Tag[]): string {
  return tags.map((t) => `- ${t.name}: ${t.hint}`).join('\n')
}
