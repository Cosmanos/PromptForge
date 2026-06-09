import sql from '../db/database'
import { encrypt, decrypt } from './crypto'
import { Provider, providerForModel } from './models'
import { LlmKey } from './llm'

// Read/write the caller's encrypted provider keys. The plaintext key only ever
// exists transiently inside encrypt()/decrypt() — it is never stored, logged,
// or returned to the client.

export interface Connection {
  provider: Provider
  last4: string
  created_at: string
}

// Public-safe view of a user's connected providers (no key material).
export async function listConnections(userId: string): Promise<Connection[]> {
  return sql<Connection[]>`
    SELECT provider, last4, created_at
    FROM provider_credentials
    WHERE user_id = ${userId}
    ORDER BY provider
  `
}

// Encrypt + upsert one provider key. Replacing an existing key overwrites the
// row (UNIQUE(user_id, provider)) and refreshes created_at.
export async function saveKey(
  userId: string,
  provider: Provider,
  plaintextKey: string
): Promise<Connection> {
  const { ciphertext, iv, authTag } = encrypt(plaintextKey)
  const last4 = plaintextKey.slice(-4)
  const [row] = await sql<Connection[]>`
    INSERT INTO provider_credentials (user_id, provider, ciphertext, iv, auth_tag, last4)
    VALUES (${userId}, ${provider}, ${ciphertext}, ${iv}, ${authTag}, ${last4})
    ON CONFLICT (user_id, provider) DO UPDATE
      SET ciphertext = EXCLUDED.ciphertext,
          iv         = EXCLUDED.iv,
          auth_tag   = EXCLUDED.auth_tag,
          last4      = EXCLUDED.last4,
          created_at = NOW()
    RETURNING provider, last4, created_at
  `
  return row
}

export async function deleteKey(userId: string, provider: Provider): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM provider_credentials
    WHERE user_id = ${userId} AND provider = ${provider}
    RETURNING id
  `
  return deleted.length > 0
}

// Fetch + decrypt the caller's key for a provider, or null if not connected.
// This is the only place plaintext re-enters the server, and only at call time.
export async function getDecryptedKey(
  userId: string,
  provider: Provider
): Promise<string | null> {
  const [row] = await sql<{ ciphertext: string; iv: string; auth_tag: string }[]>`
    SELECT ciphertext, iv, auth_tag
    FROM provider_credentials
    WHERE user_id = ${userId} AND provider = ${provider}
  `
  if (!row) return null
  return decrypt({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag })
}

export type KeyResolution =
  | { ok: true; key: LlmKey }
  | { ok: false; status: number; body: Record<string, unknown> }

// Resolve the LLM key a route needs to run a given model: map model → provider,
// then load the caller's key for that provider. Returns a tagged result the
// route turns into a 400 (unknown model, or no key connected → "Connect a
// model" so the UI can gate) without leaking key material.
export async function resolveKeyForModel(
  userId: string,
  model: string
): Promise<KeyResolution> {
  let provider: Provider
  try {
    provider = providerForModel(model)
  } catch {
    return { ok: false, status: 400, body: { error: `Unknown model: ${model}` } }
  }

  const apiKey = await getDecryptedKey(userId, provider)
  if (!apiKey) {
    return {
      ok: false,
      status: 400,
      body: { error: 'Connect a model', code: 'NO_KEY', provider },
    }
  }
  return { ok: true, key: { provider, apiKey } }
}
