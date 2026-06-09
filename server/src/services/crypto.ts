import crypto from 'crypto'

// AES-256-GCM encryption for bring-your-own provider API keys. The master key
// lives only in the API project's env (never the frontend). Plaintext keys are
// encrypted on write and decrypted only server-side at call time.

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // GCM standard nonce length

// Parse the master key once at boot. Accept either 64-char hex or base64 that
// decodes to exactly 32 bytes. Throw clearly if missing/malformed — mirror how
// the auth middleware fails fast on a missing SUPABASE_URL.
function loadMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY env var is required to encrypt provider keys')
  }
  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}); use 64 hex chars or base64 of 32 bytes`
    )
  }
  return key
}

const MASTER_KEY = loadMasterKey()

export interface Encrypted {
  ciphertext: string // base64
  iv: string // base64
  authTag: string // base64
}

export function encrypt(plaintext: string): Encrypted {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  // getAuthTag must be read AFTER final().
  const authTag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decrypt({ ciphertext, iv, authTag }: Encrypted): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(iv, 'base64'))
  // setAuthTag must be set BEFORE final().
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
