import type { ValidationVote } from "@knowledgepulse/sdk";
import type {
  PaginatedResult,
  PaginationOpts,
  ReputationRecord,
  ReputationStore,
} from "../interfaces.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class MemoryReputationStore implements ReputationStore {
  private records = new Map<string, ReputationRecord>();
  private createdAt = new Map<string, Date>();
  private votes: ValidationVote[] = [];

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
    this.createdAt.set(agentId, new Date());
    return record;
  }

  async getAll(): Promise<ReputationRecord[]> {
    return Array.from(this.records.values());
  }

  async getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>> {
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;

    const sorted = Array.from(this.records.values()).sort((a, b) => b.score - a.score);
    const total = sorted.length;
    const data = sorted.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async recordVote(vote: ValidationVote): Promise<void> {
    this.votes.push(vote);
  }

  async getVotes(): Promise<ValidationVote[]> {
    return [...this.votes];
  }

  async canVote(agentId: string): Promise<boolean> {
    const created = this.createdAt.get(agentId);
    if (!created) return false;
    return Date.now() - created.getTime() >= THIRTY_DAYS_MS;
  }

  /**
   * Backdoor for testing: override the created_at timestamp for an agent.
   * @internal
   */
  _setCreatedAt(agentId: string, date: Date): void {
    this.createdAt.set(agentId, date);
  }
}
