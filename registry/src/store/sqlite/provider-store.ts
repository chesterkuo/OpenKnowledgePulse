import type { Database } from "bun:sqlite";
import type { ProviderRecord, ProviderStore } from "../interfaces.js";

export class SqliteProviderStore implements ProviderStore {
  constructor(private db: Database) {}

  async register(
    provider: Omit<ProviderRecord, "id" | "registered_at">,
  ): Promise<ProviderRecord> {
    const id = `kp:provider:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    this.db
      .query(
        `INSERT INTO providers (id, url, name, status, last_heartbeat, registered_at)
         VALUES ($id, $url, $name, $status, $last_heartbeat, $registered_at)`,
      )
      .run({
        $id: id,
        $url: provider.url,
        $name: provider.name,
        $status: provider.status,
        $last_heartbeat: provider.last_heartbeat,
        $registered_at: now,
      });
    return {
      id,
      url: provider.url,
      name: provider.name,
      status: provider.status,
      last_heartbeat: provider.last_heartbeat,
      registered_at: now,
    };
  }

  async getAll(): Promise<ProviderRecord[]> {
    const rows = this.db
      .query("SELECT * FROM providers ORDER BY registered_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map((row) => this.rowToProvider(row));
  }

  async getById(id: string): Promise<ProviderRecord | undefined> {
    const row = this.db
      .query("SELECT * FROM providers WHERE id = $id")
      .get({ $id: id }) as Record<string, unknown> | null;
    if (!row) return undefined;
    return this.rowToProvider(row);
  }

  async updateHeartbeat(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = this.db
      .query("UPDATE providers SET last_heartbeat = $now, status = 'active' WHERE id = $id")
      .run({ $id: id, $now: now });
    return result.changes > 0;
  }

  async updateStatus(id: string, status: ProviderRecord["status"]): Promise<boolean> {
    const result = this.db
      .query("UPDATE providers SET status = $status WHERE id = $id")
      .run({ $id: id, $status: status });
    return result.changes > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .query("DELETE FROM providers WHERE id = $id")
      .run({ $id: id });
    return result.changes > 0;
  }

  private rowToProvider(row: Record<string, unknown>): ProviderRecord {
    return {
      id: row.id as string,
      url: row.url as string,
      name: row.name as string,
      status: row.status as ProviderRecord["status"],
      last_heartbeat: (row.last_heartbeat as string | null) ?? null,
      registered_at: row.registered_at as string,
    };
  }
}
