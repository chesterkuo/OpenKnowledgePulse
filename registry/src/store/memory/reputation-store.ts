import type { ReputationRecord, ReputationStore } from "../interfaces.js";

export class MemoryReputationStore implements ReputationStore {
  private records = new Map<string, ReputationRecord>();

  async get(agentId: string): Promise<ReputationRecord | undefined> {
    return this.records.get(agentId);
  }

  async upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord> {
    const existing = this.records.get(agentId);
    const now = new Date().toISOString();

    if (existing) {
      existing.score = Math.max(0, existing.score + delta);
      existing.history.push({ timestamp: now, delta, reason });
      if (delta > 0) existing.contributions++;
      existing.updated_at = now;
      return existing;
    }

    const record: ReputationRecord = {
      agent_id: agentId,
      score: Math.max(0, delta),
      contributions: delta > 0 ? 1 : 0,
      validations: 0,
      history: [{ timestamp: now, delta, reason }],
      updated_at: now,
    };
    this.records.set(agentId, record);
    return record;
  }

  async getAll(): Promise<ReputationRecord[]> {
    return Array.from(this.records.values());
  }
}
