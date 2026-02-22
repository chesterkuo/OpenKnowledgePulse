import type { SubscriptionRecord, SubscriptionStore } from "../interfaces.js";

export class MemorySubscriptionStore implements SubscriptionStore {
  /** Map keyed by subscription id */
  private byId = new Map<string, SubscriptionRecord>();
  /** Map keyed by `${agentId}:${domain}` for deduplication */
  private byKey = new Map<string, string>(); // key -> id

  async subscribe(
    agentId: string,
    domain: string,
    creditsPerMonth: number,
  ): Promise<SubscriptionRecord> {
    const key = `${agentId}:${domain}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const existingId = this.byKey.get(key);
    if (existingId) {
      const existing = this.byId.get(existingId)!;
      if (existing.status === "active") {
        // Update the existing active subscription
        existing.credits_per_month = creditsPerMonth;
        existing.started_at = now.toISOString();
        existing.expires_at = expiresAt.toISOString();
        return existing;
      }
    }

    const record: SubscriptionRecord = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      domain,
      credits_per_month: creditsPerMonth,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
    };

    this.byId.set(record.id, record);
    this.byKey.set(key, record.id);

    return record;
  }

  async unsubscribe(id: string): Promise<boolean> {
    const record = this.byId.get(id);
    if (!record) return false;
    record.status = "cancelled";
    return true;
  }

  async getActive(agentId: string): Promise<SubscriptionRecord[]> {
    const results: SubscriptionRecord[] = [];
    for (const record of this.byId.values()) {
      if (record.agent_id === agentId && record.status === "active") {
        results.push(record);
      }
    }
    return results;
  }

  async hasAccess(agentId: string, domain: string): Promise<boolean> {
    const now = new Date().toISOString();
    for (const record of this.byId.values()) {
      if (
        record.agent_id === agentId &&
        record.domain === domain &&
        record.status === "active" &&
        record.expires_at > now
      ) {
        return true;
      }
    }
    return false;
  }

  async getById(id: string): Promise<SubscriptionRecord | undefined> {
    return this.byId.get(id);
  }
}
