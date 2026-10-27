import { DatabaseSync } from "node:sqlite";
import { ProviderId, ProviderConnectionStatus, ProviderConnectionState } from "./types";
import { encryptToken, decryptToken } from "../security/token-crypto";

export interface StoredConnectionRecord {
  id: string;
  tenant_id: string;
  provider: string;
  account_id: string | null;
  property_id: string | null;
  status: string;
  scopes_json: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  health_status: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export class ProviderConnectionStore {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  saveConnection(params: {
    tenantId: string;
    provider: ProviderId;
    accountId?: string;
    propertyId?: string;
    status: ProviderConnectionStatus;
    scopes: string[];
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    metadata?: Record<string, any>;
  }): void {
    const id = `conn_${params.tenantId}_${params.provider}`;
    const now = new Date().toISOString();
    const encryptedAccessToken = params.accessToken ? encryptToken(params.accessToken) : null;
    const encryptedRefreshToken = params.refreshToken ? encryptToken(params.refreshToken) : null;

    const stmt = this.db.prepare(`
      INSERT INTO provider_connections (
        id, tenant_id, provider, account_id, property_id, status, scopes_json,
        encrypted_access_token, encrypted_refresh_token, token_expires_at,
        last_sync_at, health_status, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, provider) DO UPDATE SET
        account_id = excluded.account_id,
        property_id = excluded.property_id,
        status = excluded.status,
        scopes_json = excluded.scopes_json,
        encrypted_access_token = COALESCE(excluded.encrypted_access_token, provider_connections.encrypted_access_token),
        encrypted_refresh_token = COALESCE(excluded.encrypted_refresh_token, provider_connections.encrypted_refresh_token),
        token_expires_at = excluded.token_expires_at,
        last_sync_at = excluded.last_sync_at,
        health_status = excluded.health_status,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      params.tenantId,
      params.provider,
      params.accountId || null,
      params.propertyId || null,
      params.status,
      JSON.stringify(params.scopes || []),
      encryptedAccessToken,
      encryptedRefreshToken,
      params.tokenExpiresAt || null,
      now,
      "HEALTHY",
      JSON.stringify(params.metadata || {}),
      now,
      now
    );
  }

  getConnection(tenantId: string, provider: ProviderId): StoredConnectionRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM provider_connections
      WHERE tenant_id = ? AND provider = ?
    `);
    const row = stmt.get(tenantId, provider) as StoredConnectionRecord | undefined;
    return row || null;
  }

  updateStatus(tenantId: string, provider: ProviderId, status: ProviderConnectionStatus): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE provider_connections
      SET status = ?, updated_at = ?
      WHERE tenant_id = ? AND provider = ?
    `);
    stmt.run(status, now, tenantId, provider);
  }

  updatePropertyId(tenantId: string, provider: ProviderId, propertyId: string | null): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE provider_connections
      SET property_id = ?, updated_at = ?
      WHERE tenant_id = ? AND provider = ?
    `);
    stmt.run(propertyId, now, tenantId, provider);
  }

  updateAccountId(
    tenantId: string,
    provider: ProviderId,
    accountId: string | null,
    metadata?: Record<string, any>
  ): void {
    const now = new Date().toISOString();
    if (metadata !== undefined) {
      const stmt = this.db.prepare(`
        UPDATE provider_connections
        SET account_id = ?, metadata_json = ?, updated_at = ?
        WHERE tenant_id = ? AND provider = ?
      `);
      stmt.run(accountId, JSON.stringify(metadata), now, tenantId, provider);
    } else {
      const stmt = this.db.prepare(`
        UPDATE provider_connections
        SET account_id = ?, updated_at = ?
        WHERE tenant_id = ? AND provider = ?
      `);
      stmt.run(accountId, now, tenantId, provider);
    }
  }

  updateMetadata(tenantId: string, provider: ProviderId, metadata: Record<string, any>): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE provider_connections
      SET metadata_json = ?, updated_at = ?
      WHERE tenant_id = ? AND provider = ?
    `);
    stmt.run(JSON.stringify(metadata), now, tenantId, provider);
  }

  getDecryptedTokens(tenantId: string, provider: ProviderId): {
    accessToken?: string;
    refreshToken?: string;
    isExpired: boolean;
  } {
    const conn = this.getConnection(tenantId, provider);
    if (!conn) return { isExpired: true };

    const accessToken = conn.encrypted_access_token ? decryptToken(conn.encrypted_access_token) : undefined;
    const refreshToken = conn.encrypted_refresh_token ? decryptToken(conn.encrypted_refresh_token) : undefined;
    const isExpired = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() <= Date.now() : false;

    return { accessToken, refreshToken, isExpired };
  }

  deleteConnection(tenantId: string, provider: ProviderId): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM provider_connections
      WHERE tenant_id = ? AND provider = ?
    `);
    const info = stmt.run(tenantId, provider);
    return (info.changes as number) > 0;
  }

  listConnectionsForTenant(tenantId: string): StoredConnectionRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM provider_connections
      WHERE tenant_id = ?
    `);
    return stmt.all(tenantId) as unknown as StoredConnectionRecord[];
  }
}
