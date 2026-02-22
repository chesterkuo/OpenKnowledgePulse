import type {
  PaginatedResult,
  PaginationOpts,
  SOPVersion,
  SopStore,
  StoredSOP,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgSopStore implements SopStore {
  constructor(private pool: PgPool) {}

  async create(sop: StoredSOP): Promise<StoredSOP> {
    await this.pool.query(
      `INSERT INTO sops (id, sop_json, version, previous_version_id, status, visibility, approved_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         sop_json = EXCLUDED.sop_json,
         version = EXCLUDED.version,
         previous_version_id = EXCLUDED.previous_version_id,
         status = EXCLUDED.status,
         visibility = EXCLUDED.visibility,
         approved_by = EXCLUDED.approved_by,
         updated_at = EXCLUDED.updated_at`,
      [
        sop.id,
        JSON.stringify(sop.sop),
        sop.version,
        sop.previous_version_id ?? null,
        sop.status,
        sop.visibility,
        sop.approved_by ?? null,
        sop.created_at,
        sop.updated_at,
      ],
    );
    return sop;
  }

  async getById(id: string): Promise<StoredSOP | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM sops WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return undefined;
    return this.rowToSOP(rows[0]);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.domain) {
      conditions.push(`LOWER(sop_json->>'domain') = LOWER($${paramIndex})`);
      params.push(opts.domain);
      paramIndex++;
    }

    if (opts.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(opts.status);
      paramIndex++;
    }

    if (opts.query) {
      const pattern = `%${opts.query}%`;
      conditions.push(
        `(sop_json->>'name' ILIKE $${paramIndex} OR sop_json->>'domain' ILIKE $${paramIndex})`,
      );
      params.push(pattern);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const { rows: countRows } = await this.pool.query(
      `SELECT COUNT(*) AS total FROM sops ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].total, 10);

    // Get paginated data
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;

    const dataQuery = `SELECT * FROM sops ${whereClause}
      ORDER BY (sop_json->'metadata'->>'quality_score')::real DESC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`;
    const { rows } = await this.pool.query(dataQuery, [
      ...params,
      offset,
      limit,
    ]);

    const data = rows.map((row: Record<string, unknown>) =>
      this.rowToSOP(row),
    );

    return { data, total, offset, limit };
  }

  async update(
    id: string,
    updates: Partial<StoredSOP>,
  ): Promise<StoredSOP | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const merged: StoredSOP = { ...existing, ...updates };
    const now = new Date().toISOString();
    merged.updated_at = now;

    await this.pool.query(
      `UPDATE sops SET
         sop_json = $1,
         version = $2,
         previous_version_id = $3,
         status = $4,
         visibility = $5,
         approved_by = $6,
         updated_at = $7
       WHERE id = $8`,
      [
        JSON.stringify(merged.sop),
        merged.version,
        merged.previous_version_id ?? null,
        merged.status,
        merged.visibility,
        merged.approved_by ?? null,
        merged.updated_at,
        id,
      ],
    );

    return merged;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "DELETE FROM sops WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async getVersions(id: string): Promise<SOPVersion[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM sop_versions WHERE sop_id = $1 ORDER BY version",
      [id],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToVersion(row));
  }

  async addVersion(version: SOPVersion): Promise<void> {
    await this.pool.query(
      `INSERT INTO sop_versions (sop_id, version, diff_summary, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sop_id, version) DO NOTHING`,
      [version.sop_id, version.version, version.diff_summary, version.created_at],
    );
  }

  async getByDomain(domain: string): Promise<StoredSOP[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sops WHERE LOWER(sop_json->>'domain') = LOWER($1)`,
      [domain],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToSOP(row));
  }

  private rowToSOP(row: Record<string, unknown>): StoredSOP {
    let sop: StoredSOP["sop"];
    if (typeof row.sop_json === "string") {
      sop = JSON.parse(row.sop_json);
    } else {
      sop = row.sop_json as StoredSOP["sop"];
    }

    const result: StoredSOP = {
      id: row.id as string,
      sop,
      version: row.version as number,
      status: row.status as StoredSOP["status"],
      visibility: row.visibility as StoredSOP["visibility"],
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : (row.updated_at as string),
    };

    if (row.previous_version_id != null) {
      result.previous_version_id = row.previous_version_id as string;
    }
    if (row.approved_by != null) {
      result.approved_by = row.approved_by as string;
    }

    return result;
  }

  private rowToVersion(row: Record<string, unknown>): SOPVersion {
    return {
      sop_id: row.sop_id as string,
      version: row.version as number,
      diff_summary: row.diff_summary as string,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : (row.created_at as string),
    };
  }
}
