export type VaultEntry = {
  ciphertext: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
  expiresAt: number | null // Unix ms, null = no expiry
}

export type VaultOptions = {
  ttl?: number // seconds
}

export type Snapshot = Record<string, string>
