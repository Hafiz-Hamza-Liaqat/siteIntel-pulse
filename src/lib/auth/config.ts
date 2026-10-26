import crypto from "node:crypto";

const KNOWN_INSECURE_SECRETS = new Set([
  "siteintel_staging_session_secret_change_in_production_32bytes_min",
  "staging_session_secret_min_32_chars_random_string_here",
  "secret",
  "changeme",
  "password",
  "12345678901234567890123456789012",
  "session_secret",
]);

/**
 * Validates and retrieves SESSION_SECRET.
 * In production mode, enforces high entropy (>= 32 chars) and forbids placeholders.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!secret || secret.trim().length < 32 || KNOWN_INSECURE_SECRETS.has(secret.trim())) {
      throw new Error(
        "FATAL CONFIGURATION ERROR: In production mode, SESSION_SECRET environment variable " +
          "must be set with at least 32 characters of high-entropy randomness and must not use " +
          "a default placeholder. Application startup aborted for security."
      );
    }
    return secret.trim();
  }

  return secret?.trim() || "siteintel_dev_test_session_secret_0123456789abcdef";
}

/**
 * Computes an HMAC-SHA256 signature for a token using the configured SESSION_SECRET.
 */
export function signSessionToken(rawToken: string): string {
  const secret = getSessionSecret();
  const signature = crypto.createHmac("sha256", secret).update(rawToken).digest("hex");
  return `${rawToken}.${signature}`;
}

/**
 * Verifies and unpacks an HMAC-signed session token.
 * Returns the raw token if the signature is valid, or null if invalid or tampered.
 */
export function verifySignedSessionToken(signedValue: string): string | null {
  if (!signedValue || typeof signedValue !== "string") return null;

  const parts = signedValue.split(".");
  if (parts.length !== 2) {
    // For backwards-compatibility with unsigned tokens during migration
    if (/^[0-9a-f]{64}$/i.test(signedValue)) {
      return signedValue;
    }
    return null;
  }

  const [rawToken, signature] = parts;
  if (!rawToken || !signature) return null;

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto.createHmac("sha256", secret).update(rawToken).digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    return rawToken;
  } catch {
    return null;
  }
}
