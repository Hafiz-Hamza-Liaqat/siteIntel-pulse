import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, generateEncryptionKey } from "./token-crypto.ts";

describe("AES-256-GCM Token Encryption Security", () => {
  const testSecret = "test-secret-encryption-key-for-unit-testing-32chars!";

  it("encrypts and decrypts OAuth tokens accurately", () => {
    const originalToken = "ya29.a0AfH6SMD_secure_access_token_value_xyz123";
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(":")).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it("produces unique ciphertexts for identical tokens due to unique random IVs", () => {
    const token = "refresh_token_example_abcdef987654321";
    const enc1 = encryptToken(token);
    const enc2 = encryptToken(token);

    expect(enc1).not.toBe(enc2);
    expect(decryptToken(enc1)).toBe(token);
    expect(decryptToken(enc2)).toBe(token);
  });

  it("fails to decrypt if ciphertext is tampered with", () => {
    const token = "secret_api_key_value";
    const encrypted = encryptToken(token);
    const parts = encrypted.split(":");
    const tamperedCipher = parts[2].substring(0, parts[2].length - 2) + "00";
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

    expect(() => decryptToken(tamperedPayload)).toThrow();
  });

  it("fails to decrypt if authentication tag is tampered with", () => {
    const token = "secret_api_key_value";
    const encrypted = encryptToken(token);
    const parts = encrypted.split(":");
    const tamperedTag = "00".repeat(16);
    const tamperedPayload = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => decryptToken(tamperedPayload)).toThrow();
  });

  it("generates 32-byte hex encryption keys", () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64); // 32 bytes in hex = 64 characters
    expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
  });
});
