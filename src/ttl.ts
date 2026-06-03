import type { VaultEntry } from './types.js'

export function isExpired(entry: VaultEntry): boolean {
  if (entry.expiresAt === null) return false
  return Date.now() > entry.expiresAt
}

export function toExpiresAt(ttl?: number): number | null {
  if (ttl === undefined || ttl <= 0) return null
  return Date.now() + ttl * 1000
}
