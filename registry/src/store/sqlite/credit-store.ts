import type { Database } from "bun:sqlite";
import type {
  CreditStore,
  CreditTransaction,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";

export class SqliteCreditStore implements CreditStore {
  constructor(private db: Database) {}

  async getBalance(agentId: string): Promise<number> {
    const row = this.db
      .query("SELECT balance FROM credit_balances WHERE agent_id = $agent_id")
      .get({ $agent_id: agentId }) as { balance: number } | null;
    return row?.balance ?? 0;
  }

  async addCredits(agentId: string, amount: number, reason: string): Promise<void> {
    const current = await this.getBalance(agentId);
    const newBalance = current + amount;

    this.db
      .query(
        `INSERT INTO credit_balances (agent_id, balance)
         VALUES ($agent_id, $balance)
         ON CONFLICT(agent_id) DO UPDATE SET balance = $balance`,
      )
      .run({
        $agent_id: agentId,
        $balance: newBalance,
      });

    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      amount,
      type: "earned",
      description: reason,
      created_at: new Date().toISOString(),
    };

    this.db
      .query(
        `INSERT INTO credit_transactions (id, agent_id, amount, type, description, related_listing_id, created_at)
         VALUES ($id, $agent_id, $amount, $type, $description, $related_listing_id, $created_at)`,
      )
      .run({
        $id: tx.id,
        $agent_id: tx.agent_id,
        $amount: tx.amount,
        $type: tx.type,
        $description: tx.description,
        $related_listing_id: tx.related_listing_id ?? null,
        $created_at: tx.created_at,
      });
  }

  async deductCredits(agentId: string, amount: number, reason: string): Promise<boolean> {
    const current = await this.getBalance(agentId);
    if (current < amount) {
      return false;
    }

    const newBalance = current - amount;

    this.db
      .query(
        `INSERT INTO credit_balances (agent_id, balance)
         VALUES ($agent_id, $balance)
         ON CONFLICT(agent_id) DO UPDATE SET balance = $balance`,
      )
      .run({
        $agent_id: agentId,
        $balance: newBalance,
      });

    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      amount: -amount,
      type: "spent",
      description: reason,
      created_at: new Date().toISOString(),
    };

    this.db
      .query(
        `INSERT INTO credit_transactions (id, agent_id, amount, type, description, related_listing_id, created_at)
         VALUES ($id, $agent_id, $amount, $type, $description, $related_listing_id, $created_at)`,
      )
      .run({
        $id: tx.id,
        $agent_id: tx.agent_id,
        $amount: tx.amount,
        $type: tx.type,
        $description: tx.description,
        $related_listing_id: tx.related_listing_id ?? null,
        $created_at: tx.created_at,
      });

    return true;
  }

  async getTransactions(
    agentId: string,
    pagination: PaginationOpts,
  ): Promise<PaginatedResult<CreditTransaction>> {
    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? 20;

    const countRow = this.db
      .query("SELECT COUNT(*) as count FROM credit_transactions WHERE agent_id = $agent_id")
      .get({ $agent_id: agentId }) as { count: number };
    const total = countRow.count;

    const rows = this.db
      .query(
        `SELECT * FROM credit_transactions WHERE agent_id = $agent_id
         ORDER BY created_at ASC LIMIT $limit OFFSET $offset`,
      )
      .all({ $agent_id: agentId, $limit: limit, $offset: offset }) as Record<string, unknown>[];

    const data = rows.map((row) => this.rowToTransaction(row));

    return { data, total, offset, limit };
  }

  async getLastRefill(agentId: string): Promise<string | undefined> {
    const row = this.db
      .query("SELECT last_refill FROM credit_balances WHERE agent_id = $agent_id")
      .get({ $agent_id: agentId }) as { last_refill: string | null } | null;
    return row?.last_refill ?? undefined;
  }

  async setLastRefill(agentId: string, date: string): Promise<void> {
    this.db
      .query(
        `INSERT INTO credit_balances (agent_id, balance, last_refill)
         VALUES ($agent_id, 0, $last_refill)
         ON CONFLICT(agent_id) DO UPDATE SET last_refill = $last_refill`,
      )
      .run({
        $agent_id: agentId,
        $last_refill: date,
      });
  }

  private rowToTransaction(row: Record<string, unknown>): CreditTransaction {
    const tx: CreditTransaction = {
      id: row.id as string,
      agent_id: row.agent_id as string,
      amount: row.amount as number,
      type: row.type as CreditTransaction["type"],
      description: row.description as string,
      created_at: row.created_at as string,
    };
    if (row.related_listing_id) {
      tx.related_listing_id = row.related_listing_id as string;
    }
    return tx;
  }
}
