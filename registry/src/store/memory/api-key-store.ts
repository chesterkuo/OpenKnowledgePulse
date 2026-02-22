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

export class MemoryApiKeyStore implements ApiKeyStore {
  private keys = new Map<string, ApiKeyRecord>(); // key_hash -> record
  private prefixIndex = new Map<string, string>(); // prefix -> key_hash

  async create(
    agentId: string,
    scopes: ApiKeyRecord["scopes"],
    tier: ApiKeyRecord["tier"],
  ): Promise<{ raw_key: string; record: ApiKeyRecord }> {
    const rawKey = generateRawKey();
    const keyHash = await sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 11); // "kp_" + 8 hex chars

    const record: ApiKeyRecord = {
      key_hash: keyHash,
      key_prefix: keyPrefix,
      agent_id: agentId,
      scopes,
      tier,
      created_at: new Date().toISOString(),
      revoked: false,
    };

    this.keys.set(keyHash, record);
    this.prefixIndex.set(keyPrefix, keyHash);

    return { raw_key: rawKey, record };
  }

  async verify(rawKey: string): Promise<ApiKeyRecord | undefined> {
    const keyHash = await sha256(rawKey);
    const record = this.keys.get(keyHash);
    if (!record || record.revoked) return undefined;
    return record;
  }

  async revoke(keyPrefix: string): Promise<boolean> {
    const keyHash = this.prefixIndex.get(keyPrefix);
    if (!keyHash) return false;

    const record = this.keys.get(keyHash);
    if (!record) return false;

    record.revoked = true;
    record.revoked_at = new Date().toISOString();
    return true;
  }

  async getByAgentId(agentId: string): Promise<ApiKeyRecord[]> {
    return Array.from(this.keys.values()).filter((r) => r.agent_id === agentId);
  }
}
