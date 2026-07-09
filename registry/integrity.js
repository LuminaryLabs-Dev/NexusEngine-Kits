function bytesFrom(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new TextEncoder().encode(String(value));
}

function base64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function sha256Integrity(value, options = {}) {
  const subtle = options.subtle ?? globalThis.crypto?.subtle;
  if (!subtle) throw new TypeError("SHA-256 verification requires Web Crypto or an injected subtle implementation.");
  const digest = await subtle.digest("SHA-256", bytesFrom(value));
  return `sha256-${base64(new Uint8Array(digest))}`;
}

export async function verifyIntegrity(value, expected, options = {}) {
  if (!expected) return { ok: false, expected: null, actual: null };
  const actual = await sha256Integrity(value, options);
  return { ok: actual === expected, expected, actual };
}
