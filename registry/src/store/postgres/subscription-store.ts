import type { SubscriptionRecord, SubscriptionStore } from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgSubscriptionStore implements SubscriptionStore {
  constructor(private pool: PgPool) {}

  async subscribe(
    agentId: string,
    domain: string,
    creditsPerMonth: number,
  ): Promise<SubscriptionRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { rows } = await this.pool.query(
      `INSERT INTO subscriptions (id, agent_id, domain, credits_per_month, started_at, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (agent_id, domain) DO UPDATE SET
         credits_per_month = $4,
         started_at = $5,
         expires_at = $6,
         status = 'active'
       RETURNING *`,
      [id, agentId, domain, creditsPerMonth, now.toISOString(), expiresAt.toISOString()],
    );

    return this.rowToRecord(rows[0]);
  }

  async unsubscribe(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async getActive(agentId: string): Promise<SubscriptionRecord[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM subscriptions WHERE agent_id = $1 AND status = 'active'",
      [agentId],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToRecord(row));
  }

  async hasAccess(agentId: string, domain: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM subscriptions
       WHERE agent_id = $1 AND domain = $2 AND status = 'active' AND expires_at > NOW()
       LIMIT 1`,
      [agentId, domain],
    );
    return rows.length > 0;
  }

  async getById(id: string): Promise<SubscriptionRecord | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM subscriptions WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    return this.rowToRecord(rows[0]);
  }

  private rowToRecord(row: Record<string, unknown>): SubscriptionRecord {
    return {
      id: row.id as string,
      agent_id: row.agent_id as string,
      domain: row.domain as string,
      credits_per_month: row.credits_per_month as number,
      started_at:
        row.started_at instanceof Date
          ? row.started_at.toISOString()
          : (row.started_at as string),
      expires_at:
        row.expires_at instanceof Date
          ? row.expires_at.toISOString()
          : (row.expires_at as string),
      status: row.status as SubscriptionRecord["status"],
    };
  }
}
