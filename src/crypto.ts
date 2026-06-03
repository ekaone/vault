const ALGO = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // bytes — AES-GCM standard

const enc = new TextEncoder()
const dec = new TextDecoder()

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGO, length: KEY_LENGTH },
    false, // non-extractable — raw bytes never leave Web Crypto
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(
  value: string,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>
  const encoded = enc.encode(value)
  const buffer = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded)
  return {
    ciphertext: new Uint8Array(buffer) as Uint8Array<ArrayBuffer>,
    iv,
  }
}

export async function decrypt(
  ciphertext: Uint8Array<ArrayBuffer>,
  iv: Uint8Array<ArrayBuffer>,
  key: CryptoKey
): Promise<string> {
  const buffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext)
  return dec.decode(buffer)
}
