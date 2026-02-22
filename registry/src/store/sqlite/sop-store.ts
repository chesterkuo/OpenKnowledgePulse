import type { Database } from "bun:sqlite";
import type {
  PaginatedResult,
  PaginationOpts,
  SOPVersion,
  SopStore,
  StoredSOP,
} from "../interfaces.js";

export class SqliteSopStore implements SopStore {
  constructor(private db: Database) {}

  async create(sop: StoredSOP): Promise<StoredSOP> {
    this.db
      .query(
        `INSERT OR REPLACE INTO sops (id, sop_json, version, previous_version_id, status, visibility, approved_by, created_at, updated_at)
         VALUES ($id, $sop_json, $version, $previous_version_id, $status, $visibility, $approved_by, $created_at, $updated_at)`,
      )
      .run({
        $id: sop.id,
        $sop_json: JSON.stringify(sop.sop),
        $version: sop.version,
        $previous_version_id: sop.previous_version_id ?? null,
        $status: sop.status,
        $visibility: sop.visibility,
        $approved_by: sop.approved_by ?? null,
        $created_at: sop.created_at,
        $updated_at: sop.updated_at,
      });
    return sop;
  }

  async getById(id: string): Promise<StoredSOP | undefined> {
    const row = this.db.query("SELECT * FROM sops WHERE id = $id").get({ $id: id }) as Record<
      string,
      unknown
    > | null;
    if (!row) return undefined;
    return this.rowToSOP(row);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (opts.status) {
      conditions.push("status = $status");
      params.$status = opts.status;
    }

    if (opts.query) {
      const q = `%${opts.query.toLowerCase()}%`;
      conditions.push("LOWER(sop_json) LIKE $query");
      params.$query = q;
    }

    if (opts.domain) {
      // Domain is stored inside sop_json, so we search within JSON
      const d = `%"domain":"${opts.domain.toLowerCase()}"%`;
      // Use a broader match that works with JSON stringification
      conditions.push("LOWER(sop_json) LIKE $domain");
      params.$domain = d;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = this.db
      .query(`SELECT * FROM sops ${whereClause} ORDER BY updated_at DESC`)
      .all(params) as Record<string, unknown>[];

    let results = rows.map((row) => this.rowToSOP(row));

    // Re-filter domain in JS for exact matching (JSON LIKE may be too broad)
    if (opts.domain) {
      const d = opts.domain.toLowerCase();
      results = results.filter((s) => s.sop.domain.toLowerCase() === d);
    }

    // Re-filter query in JS for more precise matching on name, domain, decision_tree
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter((s) => {
        if (s.sop.name.toLowerCase().includes(q)) return true;
        if (s.sop.domain.toLowerCase().includes(q)) return true;
        if (
          s.sop.decision_tree.some(
            (dt) => dt.step.toLowerCase().includes(q) || dt.instruction.toLowerCase().includes(q),
          )
        )
          return true;
        return false;
      });
    }

    // Sort by quality_score descending
    results.sort((a, b) => b.sop.metadata.quality_score - a.sop.metadata.quality_score);

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async update(id: string, updates: Partial<StoredSOP>): Promise<StoredSOP | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const updated: StoredSOP = { ...existing, ...updates };
    await this.create(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.query("DELETE FROM sops WHERE id = $id").run({ $id: id });
    return result.changes > 0;
  }

  async getVersions(id: string): Promise<SOPVersion[]> {
    const rows = this.db
      .query("SELECT * FROM sop_versions WHERE sop_id = $sop_id ORDER BY version ASC")
      .all({ $sop_id: id }) as Record<string, unknown>[];
    return rows.map((row) => ({
      sop_id: row.sop_id as string,
      version: row.version as number,
      diff_summary: row.diff_summary as string,
      created_at: row.created_at as string,
    }));
  }

  async addVersion(version: SOPVersion): Promise<void> {
    this.db
      .query(
        `INSERT INTO sop_versions (sop_id, version, diff_summary, created_at)
         VALUES ($sop_id, $version, $diff_summary, $created_at)`,
      )
      .run({
        $sop_id: version.sop_id,
        $version: version.version,
        $diff_summary: version.diff_summary,
        $created_at: version.created_at,
      });
  }

  async getByDomain(domain: string): Promise<StoredSOP[]> {
    // Fetch all and filter in JS for exact matching
    const rows = this.db.query("SELECT * FROM sops").all() as Record<string, unknown>[];
    const all = rows.map((row) => this.rowToSOP(row));
    const d = domain.toLowerCase();
    return all.filter((s) => s.sop.domain.toLowerCase() === d);
  }

  private rowToSOP(row: Record<string, unknown>): StoredSOP {
    return {
      id: row.id as string,
      sop: JSON.parse(row.sop_json as string),
      version: row.version as number,
      previous_version_id: (row.previous_version_id as string) ?? undefined,
      status: row.status as StoredSOP["status"],
      visibility: row.visibility as StoredSOP["visibility"],
      approved_by: (row.approved_by as string) ?? undefined,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
