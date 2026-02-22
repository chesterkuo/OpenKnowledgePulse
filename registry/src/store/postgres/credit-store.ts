import type {
  CreditStore,
  CreditTransaction,
  PaginatedResult,
  PaginationOpts,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgCreditStore implements CreditStore {
  constructor(private pool: PgPool) {}

  async getBalance(agentId: string): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT balance FROM credit_balances WHERE agent_id = $1",
      [agentId],
    );
    if (rows.length === 0) return 0;
    return rows[0].balance as number;
  }

  async addCredits(
    agentId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    // Upsert balance
    await this.pool.query(
      `INSERT INTO credit_balances (agent_id, balance)
       VALUES ($1, $2)
       ON CONFLICT (agent_id) DO UPDATE SET
         balance = credit_balances.balance + $2`,
      [agentId, amount],
    );

    // Record transaction
    const txId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO credit_transactions (id, agent_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [txId, agentId, amount, "earned", reason],
    );
  }

  async deductCredits(
    agentId: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    // Check balance first
    const balance = await this.getBalance(agentId);
    if (balance < amount) return false;

    // Deduct balance
    await this.pool.query(
      "UPDATE credit_balances SET balance = balance - $1 WHERE agent_id = $2",
      [amount, agentId],
    );

    // Record transaction (negative amount for deductions)
    const txId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO credit_transactions (id, agent_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [txId, agentId, -amount, "spent", reason],
    );

    return true;
  }

  async getTransactions(
    agentId: string,
    pagination: PaginationOpts,
  ): Promise<PaginatedResult<CreditTransaction>> {
    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? 20;

    const { rows: countRows } = await this.pool.query(
      "SELECT COUNT(*) AS total FROM credit_transactions WHERE agent_id = $1",
      [agentId],
    );
    const total = parseInt(countRows[0].total, 10);

    const { rows } = await this.pool.query(
      `SELECT * FROM credit_transactions WHERE agent_id = $1
       ORDER BY created_at DESC
       OFFSET $2 LIMIT $3`,
      [agentId, offset, limit],
    );

    const data = rows.map((row: Record<string, unknown>) =>
      this.rowToTransaction(row),
    );

    return { data, total, offset, limit };
  }

  async getLastRefill(agentId: string): Promise<string | undefined> {
    const { rows } = await this.pool.query(
      "SELECT last_refill FROM credit_balances WHERE agent_id = $1",
      [agentId],
    );
    if (rows.length === 0) return undefined;
    return (rows[0].last_refill as string) ?? undefined;
  }

  async setLastRefill(agentId: string, date: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO credit_balances (agent_id, balance, last_refill)
       VALUES ($1, 0, $2)
       ON CONFLICT (agent_id) DO UPDATE SET
         last_refill = $2`,
      [agentId, date],
    );
  }

  private rowToTransaction(row: Record<string, unknown>): CreditTransaction {
    const tx: CreditTransaction = {
      id: row.id as string,
      agent_id: row.agent_id as string,
      amount: row.amount as number,
      type: row.type as CreditTransaction["type"],
      description: row.description as string,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
    };

    if (row.related_listing_id != null) {
      tx.related_listing_id = row.related_listing_id as string;
    }

    return tx;
  }
}
