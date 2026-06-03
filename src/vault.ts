import { generateKey, encrypt, decrypt } from './crypto.js'
import { isExpired, toExpiresAt } from './ttl.js'
import type { VaultEntry, VaultOptions, Snapshot } from './types.js'

export interface Vault {
  set(key: string, value: string, opts?: VaultOptions): Promise<void>
  get(key: string): Promise<string | null>
  delete(key: string): void
  clear(): void
  snapshot(): Snapshot
}

export async function createVault(): Promise<Vault> {
  const store = new Map<string, VaultEntry>()
  const cryptoKey = await generateKey()

  return {
    async set(key, value, opts) {
      const { ciphertext, iv } = await encrypt(value, cryptoKey)
      const expiresAt = toExpiresAt(opts?.ttl)
      store.set(key, { ciphertext, iv, expiresAt })
    },

    async get(key) {
      const entry = store.get(key)
      if (!entry) return null

      if (isExpired(entry)) {
        store.delete(key) // auto-evict
        return null
      }

      return decrypt(entry.ciphertext, entry.iv, cryptoKey)
    },

    delete(key) {
      store.delete(key)
    },

    clear() {
      store.clear()
    },

    snapshot() {
      const result: Snapshot = {}
      for (const key of store.keys()) {
        result[key] = '[sealed]'
      }
      return result
    },
  }
}
