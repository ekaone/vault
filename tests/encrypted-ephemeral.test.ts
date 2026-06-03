import { describe, it, expect, vi } from 'vitest'
import { createVault } from '../src/index.js'
import { decrypt, encrypt, generateKey } from '../src/crypto.js'

describe('encrypted storage guarantees', () => {
  it('seals values as ciphertext instead of plaintext bytes', async () => {
    const key = await generateKey()
    const value = 'runtime-secret-token'

    const { ciphertext } = await encrypt(value, key)

    expect(new TextDecoder().decode(ciphertext)).not.toBe(value)
    expect(ciphertext).not.toEqual(new TextEncoder().encode(value))
  })

  it('uses a fresh IV so identical values encrypt differently', async () => {
    const key = await generateKey()
    const value = 'same-secret'

    const first = await encrypt(value, key)
    const second = await encrypt(value, key)

    expect(first.iv).not.toEqual(second.iv)
    expect(first.ciphertext).not.toEqual(second.ciphertext)
    expect(await decrypt(first.ciphertext, first.iv, key)).toBe(value)
    expect(await decrypt(second.ciphertext, second.iv, key)).toBe(value)
  })

  it('keeps generated keys non-extractable', async () => {
    const key = await generateKey()

    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('cannot decrypt ciphertext with a different vault key', async () => {
    const sealingKey = await generateKey()
    const otherKey = await generateKey()
    const sealed = await encrypt('only-this-vault-can-read-it', sealingKey)

    await expect(decrypt(sealed.ciphertext, sealed.iv, otherKey)).rejects.toThrow()
  })
})

describe('ephemeral vault behavior', () => {
  it('does not expose plaintext through snapshots', async () => {
    const vault = await createVault()
    await vault.set('api_key', 'sk-live-secret')

    expect(vault.snapshot()).toEqual({ api_key: '[sealed]' })
    expect(JSON.stringify(vault.snapshot())).not.toContain('sk-live-secret')
  })

  it('does not share entries with a fresh vault instance', async () => {
    const firstVault = await createVault()
    await firstVault.set('session', 'memory-only')

    const freshVault = await createVault()

    expect(await freshVault.get('session')).toBeNull()
  })

  it('forgets deleted and cleared entries permanently', async () => {
    const vault = await createVault()
    await vault.set('one', 'secret-one')
    await vault.set('two', 'secret-two')

    vault.delete('one')
    expect(await vault.get('one')).toBeNull()
    expect(await vault.get('two')).toBe('secret-two')

    vault.clear()
    expect(await vault.get('two')).toBeNull()
    expect(vault.snapshot()).toEqual({})
  })

  it('evicts expired entries after their TTL', async () => {
    vi.useFakeTimers()
    try {
      const vault = await createVault()
      await vault.set('short_lived', 'gone-soon', { ttl: 1 })

      expect(await vault.get('short_lived')).toBe('gone-soon')

      vi.advanceTimersByTime(1001)

      expect(await vault.get('short_lived')).toBeNull()
      expect(vault.snapshot()).toEqual({})
    } finally {
      vi.useRealTimers()
    }
  })
})
