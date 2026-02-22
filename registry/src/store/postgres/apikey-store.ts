import type { ApiKeyRecord, ApiKeyStore } from "../interfaces.js";
import type { PgPool } from "./db.js";

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `kp_${hex}`;
}

export class PgApiKeyStore implements ApiKeyStore {
  constructor(private pool: PgPool) {}

  async create(
    agentId: string,
    scopes: ApiKeyRecord["scopes"],
    tier: ApiKeyRecord["tier"],
  ): Promise<{ raw_key: string; record: ApiKeyRecord }> {
    const rawKey = generateRawKey();
    const keyHash = await sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 11); // "kp_" + 8 hex chars
    const now = new Date().toISOString();

    const record: ApiKeyRecord = {
      key_hash: keyHash,
      key_prefix: keyPrefix,
      agent_id: agentId,
      scopes,
      tier,
      created_at: now,
      revoked: false,
    };

    await this.pool.query(
      `INSERT INTO api_keys (key_hash, key_prefix, agent_id, scopes, tier, created_at, revoked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        record.key_hash,
        record.key_prefix,
        record.agent_id,
        JSON.stringify(record.scopes),
        record.tier,
        record.created_at,
        record.revoked,
      ],
    );

    return { raw_key: rawKey, record };
  }

  async verify(rawKey: string): Promise<ApiKeyRecord | undefined> {
    const keyHash = await sha256(rawKey);
    const { rows } = await this.pool.query(
      "SELECT * FROM api_keys WHERE key_hash = $1",
      [keyHash],
    );
    if (rows.length === 0) return undefined;

    const record = this.rowToRecord(rows[0]);
    if (record.revoked) return undefined;
    return record;
  }

  async revoke(keyPrefix: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { rowCount } = await this.pool.query(
      "UPDATE api_keys SET revoked = true, revoked_at = $1 WHERE key_prefix = $2 AND revoked = false",
      [now, keyPrefix],
    );
    return (rowCount ?? 0) > 0;
  }

  async getByAgentId(agentId: string): Promise<ApiKeyRecord[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM api_keys WHERE agent_id = $1",
      [agentId],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToRecord(row));
  }

  private rowToRecord(row: Record<string, unknown>): ApiKeyRecord {
    let scopes: ApiKeyRecord["scopes"];
    if (typeof row.scopes === "string") {
      scopes = JSON.parse(row.scopes);
    } else if (Array.isArray(row.scopes)) {
      scopes = row.scopes as ApiKeyRecord["scopes"];
    } else {
      scopes = [];
    }

    const record: ApiKeyRecord = {
      key_hash: row.key_hash as string,
      key_prefix: row.key_prefix as string,
      agent_id: row.agent_id as string,
      scopes,
      tier: row.tier as ApiKeyRecord["tier"],
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
      revoked: row.revoked as boolean,
    };

    if (row.revoked_at != null) {
      record.revoked_at =
        row.revoked_at instanceof Date
          ? row.revoked_at.toISOString()
          : (row.revoked_at as string);
    }

    return record;
  }
}
