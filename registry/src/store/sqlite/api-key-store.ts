import type { Database } from "bun:sqlite";
import { sha256 } from "@knowledgepulse/sdk";
import type { ApiKeyRecord, ApiKeyStore } from "../interfaces.js";

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `kp_${hex}`;
}

export class SqliteApiKeyStore implements ApiKeyStore {
  constructor(private db: Database) {}

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

    this.db
      .query(
        `INSERT INTO api_keys (key_hash, key_prefix, agent_id, scopes, tier, created_at, revoked)
         VALUES ($key_hash, $key_prefix, $agent_id, $scopes, $tier, $created_at, $revoked)`,
      )
      .run({
        $key_hash: record.key_hash,
        $key_prefix: record.key_prefix,
        $agent_id: record.agent_id,
        $scopes: JSON.stringify(record.scopes),
        $tier: record.tier,
        $created_at: record.created_at,
        $revoked: 0,
      });

    return { raw_key: rawKey, record };
  }

  async verify(rawKey: string): Promise<ApiKeyRecord | undefined> {
    const keyHash = await sha256(rawKey);
    const row = this.db
      .query("SELECT * FROM api_keys WHERE key_hash = $key_hash")
      .get({ $key_hash: keyHash }) as Record<string, unknown> | null;

    if (!row) return undefined;

    const record = this.rowToRecord(row);
    if (record.revoked) return undefined;

    return record;
  }

  async revoke(keyPrefix: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = this.db
      .query(
        "UPDATE api_keys SET revoked = 1, revoked_at = $revoked_at WHERE key_prefix = $key_prefix AND revoked = 0",
      )
      .run({ $key_prefix: keyPrefix, $revoked_at: now });

    return result.changes > 0;
  }

  async getByAgentId(agentId: string): Promise<ApiKeyRecord[]> {
    const rows = this.db
      .query("SELECT * FROM api_keys WHERE agent_id = $agent_id")
      .all({ $agent_id: agentId }) as Record<string, unknown>[];

    return rows.map((row) => this.rowToRecord(row));
  }

  private rowToRecord(row: Record<string, unknown>): ApiKeyRecord {
    const record: ApiKeyRecord = {
      key_hash: row.key_hash as string,
      key_prefix: row.key_prefix as string,
      agent_id: row.agent_id as string,
      scopes: JSON.parse(row.scopes as string),
      tier: row.tier as ApiKeyRecord["tier"],
      created_at: row.created_at as string,
      revoked: (row.revoked as number) === 1,
    };

    if (row.revoked_at) {
      record.revoked_at = row.revoked_at as string;
    }

    return record;
  }
}
