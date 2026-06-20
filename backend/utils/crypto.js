const crypto = require('crypto');

// Authenticated symmetric encryption for vault secrets at rest (AES-256-GCM).
// Stored format: "enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>".
// Values without the "enc:v1:" prefix are treated as legacy plaintext and
// returned as-is on decrypt, so existing rows never break.

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set — refusing to handle vault secrets');
  }
  // Accept a 64-char hex or a base64-encoded 32-byte key.
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes (hex or base64)');
  }
  return key;
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

function decrypt(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value; // legacy plaintext
  const [, , ivB64, tagB64, dataB64] = value.split(':');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
