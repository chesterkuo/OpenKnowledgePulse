import type {
  AuditAction,
  AuditLogEntry,
  AuditLogStore,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgAuditLogStore implements AuditLogStore {
  constructor(private pool: PgPool) {}

  async log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
    const id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO audit_log (id, action, agent_id, resource_type, resource_id, timestamp, ip, details)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
      [
        id,
        entry.action,
        entry.agentId,
        entry.resourceType,
        entry.resourceId,
        entry.ip,
        entry.details ? JSON.stringify(entry.details) : null,
      ],
    );
  }

  async query(opts: {
    agentId?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
  }): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.agentId) {
      conditions.push(`agent_id = $${paramIndex}`);
      params.push(opts.agentId);
      paramIndex++;
    }

    if (opts.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(opts.action);
      paramIndex++;
    }

    if (opts.from) {
      conditions.push(`timestamp >= $${paramIndex}::timestamptz`);
      params.push(opts.from);
      paramIndex++;
    }

    if (opts.to) {
      conditions.push(`timestamp <= $${paramIndex}::timestamptz`);
      params.push(opts.to);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await this.pool.query(
      `SELECT * FROM audit_log ${whereClause} ORDER BY timestamp`,
      params,
    );

    return rows.map((row: Record<string, unknown>) => this.rowToEntry(row));
  }

  private rowToEntry(row: Record<string, unknown>): AuditLogEntry {
    let details: Record<string, unknown> | undefined;
    if (row.details != null) {
      if (typeof row.details === "string") {
        details = JSON.parse(row.details);
      } else {
        details = row.details as Record<string, unknown>;
      }
    }

    return {
      id: row.id as string,
      action: row.action as AuditAction,
      agentId: row.agent_id as string,
      resourceType: row.resource_type as string,
      resourceId: row.resource_id as string,
      timestamp:
        row.timestamp instanceof Date
          ? row.timestamp.toISOString()
          : (row.timestamp as string),
      ip: row.ip as string,
      details,
    };
  }
}
