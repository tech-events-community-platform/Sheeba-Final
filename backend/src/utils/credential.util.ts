import crypto from 'crypto';

export interface EncryptedCredentialPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  expiresAt: string;
}

/**
 * Generates a cryptographically secure random initial password meeting Sheeba's password policy.
 * Contains upper, lower, digits, and symbols with at least 12 characters of entropy.
 */
export function generateRandomInitialPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;

  // Guarantee at least one character from each required class
  const chars: string[] = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const randomBytes = crypto.randomBytes(length);
  for (let i = chars.length; i < length; i++) {
    chars.push(all[randomBytes[i] % all.length]);
  }

  // Cryptographically shuffle using Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}

/**
 * Encrypts a temporary credential with AES-256-GCM for short-lived storage in the outbox queue.
 */
export function encryptCredential(plaintext: string): EncryptedCredentialPayload {
  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.JWT_SECRET || 'sheeba_secure_credential_encryption_key_2026')
    .digest();

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // Short-lived: 2 hours validity for initial credential delivery
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag,
    expiresAt,
  };
}

/**
 * Decrypts a temporary credential from the outbox queue.
 * Returns null if expired, tampered, or invalid.
 */
export function decryptCredential(payload: EncryptedCredentialPayload): string | null {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
    return null;
  }

  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    console.warn('[CredentialUtil] ⚠️ Encrypted initial credential payload has expired.');
    return null;
  }

  try {
    const secretKey = crypto
      .createHash('sha256')
      .update(process.env.JWT_SECRET || 'sheeba_secure_credential_encryption_key_2026')
      .digest();

    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.warn('[CredentialUtil] ⚠️ Decryption failed (integrity check or invalid key):', err?.message || err);
    return null;
  }
}
