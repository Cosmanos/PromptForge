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

export function buildTagListForPrompt(tags: Tag[]): string {
  return tags.map((t) => `id:${t.id} name:"${t.name}" hint:"${t.hint}"`).join('\n')
}

export function buildTagHintsForRewrite(tags: Tag[]): string {
  return tags.map((t) => `- ${t.name}: ${t.hint}`).join('\n')
}
