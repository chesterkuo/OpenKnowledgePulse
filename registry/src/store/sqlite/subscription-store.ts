import type { Database } from "bun:sqlite";
import type { SubscriptionRecord, SubscriptionStore } from "../interfaces.js";

export class SqliteSubscriptionStore implements SubscriptionStore {
  constructor(private db: Database) {}

  async subscribe(
    agentId: string,
    domain: string,
    creditsPerMonth: number,
  ): Promise<SubscriptionRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    this.db
      .query(
        `INSERT INTO subscriptions (id, agent_id, domain, credits_per_month, started_at, expires_at, status)
         VALUES ($id, $agent_id, $domain, $credits_per_month, $started_at, $expires_at, 'active')
         ON CONFLICT(agent_id, domain) DO UPDATE SET
           credits_per_month = $credits_per_month,
           started_at = $started_at,
           expires_at = $expires_at,
           status = 'active'`,
      )
      .run({
        $id: id,
        $agent_id: agentId,
        $domain: domain,
        $credits_per_month: creditsPerMonth,
        $started_at: now.toISOString(),
        $expires_at: expiresAt.toISOString(),
      });

    // Retrieve the record (could be the inserted or updated one)
    const row = this.db
      .query(
        "SELECT * FROM subscriptions WHERE agent_id = $agent_id AND domain = $domain",
      )
      .get({ $agent_id: agentId, $domain: domain }) as Record<string, unknown>;

    return this.rowToRecord(row);
  }

  async unsubscribe(id: string): Promise<boolean> {
    const result = this.db
      .query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $id")
      .run({ $id: id });
    return result.changes > 0;
  }

  async getActive(agentId: string): Promise<SubscriptionRecord[]> {
    const rows = this.db
      .query(
        "SELECT * FROM subscriptions WHERE agent_id = $agent_id AND status = 'active'",
      )
      .all({ $agent_id: agentId }) as Record<string, unknown>[];

    return rows.map((row) => this.rowToRecord(row));
  }

  async hasAccess(agentId: string, domain: string): Promise<boolean> {
    const now = new Date().toISOString();
    const row = this.db
      .query(
        `SELECT 1 FROM subscriptions
         WHERE agent_id = $agent_id AND domain = $domain AND status = 'active' AND expires_at > $now
         LIMIT 1`,
      )
      .get({ $agent_id: agentId, $domain: domain, $now: now });

    return row !== null;
  }

  async getById(id: string): Promise<SubscriptionRecord | undefined> {
    const row = this.db
      .query("SELECT * FROM subscriptions WHERE id = $id")
      .get({ $id: id }) as Record<string, unknown> | null;

    if (!row) return undefined;
    return this.rowToRecord(row);
  }

  private rowToRecord(row: Record<string, unknown>): SubscriptionRecord {
    return {
      id: row.id as string,
      agent_id: row.agent_id as string,
      domain: row.domain as string,
      credits_per_month: row.credits_per_month as number,
      started_at: row.started_at as string,
      expires_at: row.expires_at as string,
      status: row.status as SubscriptionRecord["status"],
    };
  }
}
