import { describe, it, expect, vi } from 'vitest'
import { createVault } from '../src/index.js'

describe('createVault', () => {
  it('returns a vault instance with all 5 methods', async () => {
    const vault = await createVault()
    expect(typeof vault.set).toBe('function')
    expect(typeof vault.get).toBe('function')
    expect(typeof vault.delete).toBe('function')
    expect(typeof vault.clear).toBe('function')
    expect(typeof vault.snapshot).toBe('function')
  })

  it('two vault instances are isolated', async () => {
    const v1 = await createVault()
    const v2 = await createVault()
    await v1.set('key', 'secret')
    expect(await v2.get('key')).toBeNull()
  })
})

describe('vault.set / vault.get', () => {
  it('encrypts and decrypts a value correctly', async () => {
    const vault = await createVault()
    await vault.set('claude_key', '636_hsgs')
    expect(await vault.get('claude_key')).toBe('636_hsgs')
  })

  it('returns null for a missing key', async () => {
    const vault = await createVault()
    expect(await vault.get('missing')).toBeNull()
  })

  it('overwrites an existing key', async () => {
    const vault = await createVault()
    await vault.set('key', 'first')
    await vault.set('key', 'second')
    expect(await vault.get('key')).toBe('second')
  })

  it('handles empty string value', async () => {
    const vault = await createVault()
    await vault.set('key', '')
    expect(await vault.get('key')).toBe('')
  })

  it('handles special characters in value', async () => {
    const vault = await createVault()
    await vault.set('key', 'sk-abc!@#$%^&*()_+')
    expect(await vault.get('key')).toBe('sk-abc!@#$%^&*()_+')
  })

  it('handles unicode value', async () => {
    const vault = await createVault()
    await vault.set('key', '日本語テスト🔐')
    expect(await vault.get('key')).toBe('日本語テスト🔐')
  })

  it('stores multiple keys independently', async () => {
    const vault = await createVault()
    await vault.set('a', 'value-a')
    await vault.set('b', 'value-b')
    expect(await vault.get('a')).toBe('value-a')
    expect(await vault.get('b')).toBe('value-b')
  })
})

describe('vault TTL', () => {
  it('returns value before TTL expires', async () => {
    const vault = await createVault()
    await vault.set('key', 'secret', { ttl: 60 })
    expect(await vault.get('key')).toBe('secret')
  })

  it('returns null after TTL expires', async () => {
    vi.useFakeTimers()
    const vault = await createVault()
    await vault.set('key', 'secret', { ttl: 1 })

    vi.advanceTimersByTime(1001)
    expect(await vault.get('key')).toBeNull()
    vi.useRealTimers()
  })

  it('auto-evicts expired entry from store', async () => {
    vi.useFakeTimers()
    const vault = await createVault()
    await vault.set('key', 'secret', { ttl: 1 })

    vi.advanceTimersByTime(1001)
    await vault.get('key') // triggers eviction

    expect(vault.snapshot()).toEqual({}) // entry gone
    vi.useRealTimers()
  })

  it('no TTL means entry lives until delete or clear', async () => {
    const vault = await createVault()
    await vault.set('key', 'secret')
    expect(await vault.get('key')).toBe('secret')
  })

  it('ttl of 0 or negative is treated as no TTL', async () => {
    const vault = await createVault()
    await vault.set('key', 'secret', { ttl: 0 })
    expect(await vault.get('key')).toBe('secret')
  })
})

describe('vault.delete', () => {
  it('removes a single key', async () => {
    const vault = await createVault()
    await vault.set('a', 'value-a')
    await vault.set('b', 'value-b')
    vault.delete('a')
    expect(await vault.get('a')).toBeNull()
    expect(await vault.get('b')).toBe('value-b')
  })

  it('is a no-op for missing key', async () => {
    const vault = await createVault()
    expect(() => vault.delete('nonexistent')).not.toThrow()
  })
})

describe('vault.clear', () => {
  it('wipes all entries', async () => {
    const vault = await createVault()
    await vault.set('a', 'value-a')
    await vault.set('b', 'value-b')
    vault.clear()
    expect(await vault.get('a')).toBeNull()
    expect(await vault.get('b')).toBeNull()
  })

  it('vault is reusable after clear', async () => {
    const vault = await createVault()
    await vault.set('key', 'before')
    vault.clear()
    await vault.set('key', 'after')
    expect(await vault.get('key')).toBe('after')
  })
})

describe('vault.snapshot', () => {
  it('returns redacted view with [sealed] for all values', async () => {
    const vault = await createVault()
    await vault.set('claude_key', '636_hsgs')
    await vault.set('db_pass', 's3cur3p@ss')
    expect(vault.snapshot()).toEqual({
      claude_key: '[sealed]',
      db_pass: '[sealed]',
    })
  })

  it('returns empty object when vault is empty', async () => {
    const vault = await createVault()
    expect(vault.snapshot()).toEqual({})
  })

  it('does not expose plain values', async () => {
    const vault = await createVault()
    await vault.set('key', '636_hsgs')
    const snap = vault.snapshot()
    expect(Object.values(snap)).not.toContain('636_hsgs')
  })

  it('snapshot does not include expired entries that were evicted', async () => {
    vi.useFakeTimers()
    const vault = await createVault()
    await vault.set('expired', 'value', { ttl: 1 })
    await vault.set('alive', 'value2')

    vi.advanceTimersByTime(1001)
    await vault.get('expired') // trigger eviction

    expect(vault.snapshot()).toEqual({ alive: '[sealed]' })
    vi.useRealTimers()
  })
})
