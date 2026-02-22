import type { ProviderRecord, ProviderStore } from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgProviderStore implements ProviderStore {
  constructor(private pool: PgPool) {}

  async register(
    provider: Omit<ProviderRecord, "id" | "registered_at">,
  ): Promise<ProviderRecord> {
    const id = `kp:provider:${crypto.randomUUID()}`;
    const { rows } = await this.pool.query(
      `INSERT INTO providers (id, url, name, status, last_heartbeat)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, provider.url, provider.name, provider.status, provider.last_heartbeat],
    );
    return this.rowToProvider(rows[0]);
  }

  async getAll(): Promise<ProviderRecord[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM providers ORDER BY registered_at DESC",
    );
    return rows.map((row: Record<string, unknown>) => this.rowToProvider(row));
  }

  async getById(id: string): Promise<ProviderRecord | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM providers WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    return this.rowToProvider(rows[0]);
  }

  async updateHeartbeat(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "UPDATE providers SET last_heartbeat = NOW(), status = 'active' WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async updateStatus(id: string, status: ProviderRecord["status"]): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "UPDATE providers SET status = $2 WHERE id = $1",
      [id, status],
    );
    return (rowCount ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "DELETE FROM providers WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  private rowToProvider(row: Record<string, unknown>): ProviderRecord {
    return {
      id: row.id as string,
      url: row.url as string,
      name: row.name as string,
      status: row.status as ProviderRecord["status"],
      last_heartbeat:
        row.last_heartbeat instanceof Date
          ? row.last_heartbeat.toISOString()
          : (row.last_heartbeat as string | null),
      registered_at:
        row.registered_at instanceof Date
          ? row.registered_at.toISOString()
          : (row.registered_at as string),
    };
  }
}
