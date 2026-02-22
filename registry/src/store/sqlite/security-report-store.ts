import type { Database } from "bun:sqlite";
import type {
  QuarantineStatus,
  SecurityReport,
  SecurityReportStore,
} from "../interfaces.js";

export class SqliteSecurityReportStore implements SecurityReportStore {
  constructor(private db: Database) {}

  async report(
    unitId: string,
    reporterId: string,
    reason: string,
  ): Promise<SecurityReport> {
    const id = `kp:sr:${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT OR REPLACE INTO security_reports (id, unit_id, reporter_id, reason, created_at)
         VALUES (
           COALESCE(
             (SELECT id FROM security_reports WHERE unit_id = $unit_id AND reporter_id = $reporter_id),
             $id
           ),
           $unit_id, $reporter_id, $reason,
           COALESCE(
             (SELECT created_at FROM security_reports WHERE unit_id = $unit_id AND reporter_id = $reporter_id),
             $created_at
           )
         )`,
      )
      .run({
        $id: id,
        $unit_id: unitId,
        $reporter_id: reporterId,
        $reason: reason,
        $created_at: now,
      });

    // Read back the stored row
    const row = this.db
      .query(
        "SELECT * FROM security_reports WHERE unit_id = $unit_id AND reporter_id = $reporter_id",
      )
      .get({ $unit_id: unitId, $reporter_id: reporterId }) as Record<string, unknown>;

    return this.rowToReport(row);
  }

  async getReportsForUnit(unitId: string): Promise<SecurityReport[]> {
    const rows = this.db
      .query(
        "SELECT * FROM security_reports WHERE unit_id = $unit_id ORDER BY created_at DESC",
      )
      .all({ $unit_id: unitId }) as Record<string, unknown>[];
    return rows.map((row) => this.rowToReport(row));
  }

  async getReportCount(unitId: string): Promise<number> {
    const row = this.db
      .query(
        "SELECT COUNT(*) AS count FROM security_reports WHERE unit_id = $unit_id",
      )
      .get({ $unit_id: unitId }) as Record<string, unknown>;
    return row.count as number;
  }

  async getAllReported(): Promise<
    Array<{ unit_id: string; count: number; status: QuarantineStatus }>
  > {
    const rows = this.db
      .query(
        `SELECT sr.unit_id, COUNT(*) AS count, ku.quarantine_status AS status
         FROM security_reports sr
         LEFT JOIN knowledge_units ku ON ku.id = sr.unit_id
         GROUP BY sr.unit_id
         ORDER BY count DESC`,
      )
      .all() as Record<string, unknown>[];
    return rows.map((row) => ({
      unit_id: row.unit_id as string,
      count: row.count as number,
      status: (row.status as QuarantineStatus) ?? null,
    }));
  }

  async resolve(unitId: string, _verdict: "cleared" | "removed"): Promise<void> {
    this.db
      .query("DELETE FROM security_reports WHERE unit_id = $unit_id")
      .run({ $unit_id: unitId });
  }

  private rowToReport(row: Record<string, unknown>): SecurityReport {
    return {
      id: row.id as string,
      unit_id: row.unit_id as string,
      reporter_id: row.reporter_id as string,
      reason: row.reason as string,
      created_at: row.created_at as string,
    };
  }
}
