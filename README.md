# @ekaone/vault

> Encrypted, ephemeral, runtime-agnostic key-value store with TTL. Secrets that can't leak what they don't expose.

## Why

When you load secrets from `.env` or a secrets manager, they become plain strings in RAM — visible in heap dumps, accidentally printed via `console.log`, and readable by any code in the process.

`@ekaone/vault` closes that gap. It encrypts values with **AES-GCM 256-bit** via the Web Crypto API and holds them encrypted until you explicitly call `get()`.

```
[.env / Platform ENV / Secrets Manager]
              ↓  on startup
       [process.env]       ← plain text, exposed
              ↓  vault.set()
       [@ekaone/vault]     ← AES-GCM encrypted, protected
              ↓  delete process.env.X
       [process.env clean]
```

## Install

```bash
npm install @ekaone/vault
```

## Usage

```ts
import { createVault } from '@ekaone/vault'

const vault = await createVault()

// Load from env — vault encrypts immediately
await vault.set('claude_key', process.env.CLAUDE_API_KEY!, { ttl: 3600 })
delete process.env.CLAUDE_API_KEY // optional clean slate

// Use the secret
const key = await vault.get('claude_key') // '636_hsgs' or null if expired

// Safe logging — values never exposed
console.log(vault.snapshot()) // { claude_key: '[sealed]' }
```

## API

### `createVault()`

Creates a new vault instance. Generates a non-extractable AES-GCM 256-bit `CryptoKey` — raw bytes never leave Web Crypto internals.

```ts
const vault = await createVault()
```

### `vault.set(key, value, opts?)`

Encrypts and stores a value. Each entry gets a unique random IV.

```ts
await vault.set('api_key', 'sk-...')
await vault.set('token', 'xyz', { ttl: 900 }) // expires in 15 minutes
```

### `vault.get(key)`

Decrypts and returns the value, or `null` if missing or expired. Expired entries are auto-evicted.

```ts
const key = await vault.get('api_key') // string | null
```

### `vault.delete(key)`

Removes a single entry immediately.

```ts
vault.delete('api_key')
```

### `vault.clear()`

Wipes all entries. The encryption key survives — vault is reusable.

```ts
vault.clear()
```

### `vault.snapshot()`

Returns a redacted view — all values replaced with `[sealed]`. Safe to log or pass to error reporters.

```ts
vault.snapshot() // { api_key: '[sealed]', token: '[sealed]' }
```

## TTL

TTL is checked lazily on `get()` — no background timers. When a TTL expires, `get()` returns `null` and evicts the entry.

```ts
await vault.set('token', 'xyz', { ttl: 60 }) // 60 seconds

// ...61 seconds later
await vault.get('token') // null — auto-evicted, no error thrown
```

Handle `null` in your app:

```ts
const token = await vault.get('token')
if (!token) {
  // re-fetch from secrets manager and reload
  const fresh = await fetchFromSecretsManager('token')
  await vault.set('token', fresh, { ttl: 3600 })
}
```

## Security Model

| What an attacker sees | Without vault | With vault |
|---|---|---|
| Plain secret in heap snapshot | Always visible | Microseconds only (during set/get) |
| Encrypted bytes at rest | — | All they see |
| Encryption key bytes | — | Non-extractable, never visible |

Vault does not make secrets invisible to a determined attacker with full process access. It makes **accidental exposure practically impossible** and deliberate extraction significantly harder.

## Runtime Support

| Runtime | Support |
|---|---|
| Node.js 18+ | ✅ Full |
| Bun | ✅ Full |
| Deno | ✅ Full |
| Browser | ✅ Full |
| Cloudflare Workers | ✅ Full |
| Vercel / Netlify Functions | ⚠️ Not recommended — vault resets per request |

> **Note:** `@ekaone/vault` is designed for long-running processes. In serverless environments, vault state does not persist between requests.

## vs. Other Tools

| Tool | Layer | Encrypted | TTL | Snapshot |
|---|---|---|---|---|
| dotenv | Load secrets into process | No | No | No |
| AWS Secrets Manager | Store + distribute secrets | Yes (at rest) | No | No |
| @ekaone/shielded | Hide values from logging | No | No | Yes |
| **@ekaone/vault** | Protect secrets in process RAM | **Yes (AES-GCM)** | **Yes** | **Yes** |

`@ekaone/vault` does not replace `.env` or secrets managers. It owns the **in-process layer** — what happens after you have already fetched secrets from wherever they live.

## License

MIT © [Eka Prasetia](./LICENSE)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/vault)
- [GitHub Repository](https://github.com/ekaone/vault)
- [Issue Tracker](https://github.com/ekaone/vault/issues)

## Related Packages

- [Credit card masking library](https://github.com/ekaone/mask-card)
- [Token masking library](https://github.com/ekaone/mask-token)
- [Phone masking library](https://github.com/ekaone/mask-phone)
- [Email masking library](https://github.com/ekaone/mask-email)

---

⭐ If this library helps you, please consider giving it a star on GitHub!
