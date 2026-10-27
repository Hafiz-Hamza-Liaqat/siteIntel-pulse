import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export interface StoredOAuthState {
  stateToken: string;
  tenantId: string;
  provider: string;
  codeVerifier?: string;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

export class OAuthStateManager {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  /**
   * Generates a secure random OAuth state and optional PKCE pair.
   * State expires after 10 minutes (600,000 ms).
   */
  createState(tenantId: string, provider: string, redirectUri: string): {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
  } {
    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const stmt = this.db.prepare(`
      INSERT INTO oauth_states (state_token, tenant_id, provider, code_verifier, redirect_uri, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(state, tenantId, provider, codeVerifier, redirectUri, now, expiresAt);

    return { state, codeVerifier, codeChallenge };
  }

  /**
   * Validates and consumes an OAuth state token.
   * State is strictly one-time use and immediately purged upon validation.
   */
  validateAndConsumeState(stateToken: string, expectedTenantId: string, expectedProvider: string): {
    isValid: boolean;
    codeVerifier?: string;
    redirectUri?: string;
    rejectionReason?: string;
  } {
    const now = Date.now();

    // Clean up expired states first
    try {
      this.db.prepare("DELETE FROM oauth_states WHERE expires_at < ?").run(now);
    } catch {}

    const stmt = this.db.prepare(`
      SELECT state_token, tenant_id, provider, code_verifier, redirect_uri, expires_at
      FROM oauth_states
      WHERE state_token = ?
    `);
    const row = stmt.get(stateToken) as {
      state_token: string;
      tenant_id: string;
      provider: string;
      code_verifier?: string;
      redirect_uri: string;
      expires_at: number;
    } | undefined;

    if (!row) {
      return { isValid: false, rejectionReason: "Invalid or already consumed OAuth state token (potential replay attack)." };
    }

    // Immediately delete to enforce one-time usage
    this.db.prepare("DELETE FROM oauth_states WHERE state_token = ?").run(stateToken);

    if (row.expires_at < now) {
      return { isValid: false, rejectionReason: "OAuth state token expired." };
    }

    if (row.tenant_id !== expectedTenantId) {
      return { isValid: false, rejectionReason: "OAuth state token tenant mismatch (cross-tenant request prohibited)." };
    }

    if (row.provider !== expectedProvider) {
      return { isValid: false, rejectionReason: "OAuth state token provider mismatch." };
    }

    return {
      isValid: true,
      codeVerifier: row.code_verifier,
      redirectUri: row.redirect_uri,
    };
  }
}
