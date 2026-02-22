import type {
  CreditStore,
  CreditTransaction,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";

export class MemoryCreditStore implements CreditStore {
  private balances = new Map<string, number>();
  private transactions = new Map<string, CreditTransaction[]>();
  private lastRefills = new Map<string, string>();

  async getBalance(agentId: string): Promise<number> {
    return this.balances.get(agentId) ?? 0;
  }

  async addCredits(
    agentId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const current = this.balances.get(agentId) ?? 0;
    this.balances.set(agentId, current + amount);

    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      amount,
      type: "earned",
      description: reason,
      created_at: new Date().toISOString(),
    };

    const existing = this.transactions.get(agentId);
    if (existing) {
      existing.push(tx);
    } else {
      this.transactions.set(agentId, [tx]);
    }
  }

  async deductCredits(
    agentId: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    const current = this.balances.get(agentId) ?? 0;
    if (current < amount) {
      return false;
    }

    this.balances.set(agentId, current - amount);

    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      amount: -amount,
      type: "spent",
      description: reason,
      created_at: new Date().toISOString(),
    };

    const existing = this.transactions.get(agentId);
    if (existing) {
      existing.push(tx);
    } else {
      this.transactions.set(agentId, [tx]);
    }

    return true;
  }

  async getTransactions(
    agentId: string,
    pagination: PaginationOpts,
  ): Promise<PaginatedResult<CreditTransaction>> {
    const all = this.transactions.get(agentId) ?? [];
    const total = all.length;
    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? 20;
    const data = all.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async getLastRefill(agentId: string): Promise<string | undefined> {
    return this.lastRefills.get(agentId);
  }

  async setLastRefill(agentId: string, date: string): Promise<void> {
    this.lastRefills.set(agentId, date);
  }
}
