import type {
  QuarantineStatus,
  SecurityReport,
  SecurityReportStore,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgSecurityReportStore implements SecurityReportStore {
  constructor(private pool: PgPool) {}

  async report(
    unitId: string,
    reporterId: string,
    reason: string,
  ): Promise<SecurityReport> {
    const id = `kp:sr:${crypto.randomUUID()}`;
    const { rows } = await this.pool.query(
      `INSERT INTO security_reports (id, unit_id, reporter_id, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (unit_id, reporter_id) DO UPDATE SET
         reason = EXCLUDED.reason
       RETURNING *`,
      [id, unitId, reporterId, reason],
    );
    return this.rowToReport(rows[0]);
  }

  async getReportsForUnit(unitId: string): Promise<SecurityReport[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM security_reports WHERE unit_id = $1 ORDER BY created_at DESC",
      [unitId],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToReport(row));
  }

  async getReportCount(unitId: string): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT COUNT(*) AS count FROM security_reports WHERE unit_id = $1",
      [unitId],
    );
    return parseInt(rows[0].count, 10);
  }

  async getAllReported(): Promise<
    Array<{ unit_id: string; count: number; status: QuarantineStatus }>
  > {
    const { rows } = await this.pool.query(
      `SELECT sr.unit_id, COUNT(*)::int AS count, ku.quarantine_status AS status
       FROM security_reports sr
       LEFT JOIN knowledge_units ku ON ku.id = sr.unit_id
       GROUP BY sr.unit_id, ku.quarantine_status
       ORDER BY count DESC`,
    );
    return rows.map((row: Record<string, unknown>) => ({
      unit_id: row.unit_id as string,
      count: typeof row.count === "string" ? parseInt(row.count, 10) : (row.count as number),
      status: (row.status as QuarantineStatus) ?? null,
    }));
  }

  async resolve(unitId: string, _verdict: "cleared" | "removed"): Promise<void> {
    await this.pool.query(
      "DELETE FROM security_reports WHERE unit_id = $1",
      [unitId],
    );
  }

  private rowToReport(row: Record<string, unknown>): SecurityReport {
    return {
      id: row.id as string,
      unit_id: row.unit_id as string,
      reporter_id: row.reporter_id as string,
      reason: row.reason as string,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
    };
  }
}
