# @ekaone/vault

> Encrypted, ephemeral, runtime-agnostic key-value store with TTL.

`@ekaone/vault` keeps runtime secrets encrypted in memory and only decrypts them when you explicitly call `get()`. It is designed for secrets that have already been loaded from `.env`, platform environment variables, or a secrets manager.

## Why

When secrets are loaded into `process.env`, they become plain strings in process memory. They can appear in heap snapshots, accidental logs, error reports, or debugging output.

This package narrows that exposure window:

```text
.env / platform env / secrets manager
        |
        v
process.env                 plain text
        |
        v
vault.set()                 encrypted with AES-GCM
        |
        v
delete process.env.SECRET   optional cleanup
```

Values are encrypted with AES-GCM 256-bit keys through the Web Crypto API. Each vault instance creates its own non-extractable `CryptoKey`, and each stored value gets a fresh random IV.

## Install

```bash
npm install @ekaone/vault
```

## Usage

```ts
import { createVault } from '@ekaone/vault'

const vault = await createVault()

await vault.set('your_secret_key', process.env.YOUR_API_KEY!, { ttl: 3600 })

// Remove the secret from the global environment object after startup so it is less likely to be exposed by logs, debugging tools, or accidental inspection.
delete process.env.YOUR_API_KEY

const key = await vault.get('your_secret_key')
if (key) {
  // Use the secret here.
}

console.log(vault.snapshot())
// { your_secret_key: '[sealed]' }
```

## API

### `createVault()`

Creates a new isolated vault instance.

```ts
const vault = await createVault()
```

Each vault has its own in-memory store and its own non-extractable AES-GCM key. Entries are not shared between vault instances.

### `vault.set(key, value, opts?)`

Encrypts and stores a string value.

```ts
await vault.set('api_key', 'sk-...')
await vault.set('token', 'xyz', { ttl: 900 }) // expires in 15 minutes
```

Options:

```ts
type VaultOptions = {
  ttl?: number // seconds
}
```

A missing, zero, or negative TTL means the value lives until `delete()` or `clear()`.

### `vault.get(key)`

Decrypts and returns the value, or returns `null` when the key is missing or expired.

```ts
const key = await vault.get('api_key') // string | null
```

Expired entries are evicted lazily during `get()`. There are no background timers.

### `vault.delete(key)`

Removes a single entry.

```ts
vault.delete('api_key')
```

### `vault.clear()`

Removes every entry from the vault. The vault remains reusable.

```ts
vault.clear()
await vault.set('api_key', 'new-secret')
```

### `vault.snapshot()`

Returns a redacted view of the vault. Stored values are never included.

```ts
vault.snapshot()
// { api_key: '[sealed]', token: '[sealed]' }
```

## Ephemeral Behavior

Vault data is intentionally memory-only:

- Creating a new vault starts with an empty store.
- Entries are lost when the process or runtime instance ends.
- `delete()` and `clear()` remove entries immediately.
- TTL entries are removed the next time they are read after expiry.

This package does not persist secrets to disk, local storage, databases, or external services.

## Security Model

| Property | Behavior |
| --- | --- |
| Encryption | AES-GCM 256-bit via Web Crypto |
| IVs | Fresh random IV per stored value |
| Keys | Non-extractable `CryptoKey` per vault instance |
| Snapshots | Redacted values only |
| Persistence | None, memory-only |

`@ekaone/vault` reduces accidental exposure of secrets in logs, snapshots, and ordinary application state. It does not make secrets invisible to code that is allowed to call `get()`, and it cannot fully protect against an attacker with complete control of the running process.

## Runtime Support

Any runtime with the standard Web Crypto API should work.

| Runtime | Support |
| --- | --- |
| Node.js 18+ | Full |
| Bun | Full |
| Deno | Full |
| Browser | Full |
| Cloudflare Workers | Full |
| Vercel / Netlify Functions | Works, but state resets per invocation |

For serverless and edge functions, treat the vault as request-local or instance-local cache. It should not be used as persistent storage.

## Testing

```bash
npm test
```

The test suite covers encryption behavior, isolated vault instances, redacted snapshots, deletion, clearing, and TTL eviction.

## vs. Other Tools

| Tool | Layer | Encrypted in process | TTL | Redacted snapshot |
| --- | --- | --- | --- | --- |
| dotenv | Loads env files | No | No | No |
| AWS Secrets Manager | Stores and distributes secrets | No, not after fetch | No | No |
| @ekaone/shielded | Hides values from logging | No | No | Yes |
| @ekaone/vault | Protects runtime secrets | Yes | Yes | Yes |

`@ekaone/vault` does not replace `.env` files or secrets managers. It protects the in-process layer after secrets have already been fetched.

## License

MIT (c) [Eka Prasetia](./LICENSE)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/vault)
- [GitHub Repository](https://github.com/ekaone/vault)
- [Issue Tracker](https://github.com/ekaone/vault/issues)

## Related Packages

- [Credit card masking library](https://github.com/ekaone/mask-card)
- [Token masking library](https://github.com/ekaone/mask-token)
- [Phone masking library](https://github.com/ekaone/mask-phone)
- [Email masking library](https://github.com/ekaone/mask-email)
