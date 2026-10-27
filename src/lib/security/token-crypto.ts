import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Derives a 32-byte key from available server secret configuration.
 * Never defaults to an insecure hardcoded key in production.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.PROVIDER_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mandatory PROVIDER_ENCRYPTION_KEY or SESSION_SECRET missing in production.");
    }
    // Safe deterministic development fallback key (32 bytes)
    return crypto.createHash("sha256").update("siteintel-pulse-dev-secret-only").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedPackage {
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // hex
}

/**
 * Encrypts a sensitive plaintext string (such as an OAuth access or refresh token)
 * using AES-256-GCM with a cryptographically unique IV per operation.
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Pack as colon-delimited string: iv:tag:ciphertext
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM token package.
 * Verifies cryptographic integrity via authentication tag; throws if tampered with.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return "";
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format. Expected iv:tag:ciphertext");
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
