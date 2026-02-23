import type {
  KnowledgeStore,
  PaginatedResult,
  PaginationOpts,
  QuarantineStatus,
  StoredKnowledgeUnit,
} from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgKnowledgeStore implements KnowledgeStore {
  constructor(private pool: PgPool) {}

  async create(entry: StoredKnowledgeUnit): Promise<StoredKnowledgeUnit> {
    await this.pool.query(
      `INSERT INTO knowledge_units (id, unit_json, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         unit_json = EXCLUDED.unit_json,
         visibility = EXCLUDED.visibility,
         updated_at = EXCLUDED.updated_at`,
      [entry.id, JSON.stringify(entry.unit), entry.visibility, entry.created_at, entry.updated_at],
    );
    return entry;
  }

  async getById(id: string): Promise<StoredKnowledgeUnit | undefined> {
    const { rows } = await this.pool.query("SELECT * FROM knowledge_units WHERE id = $1", [id]);
    if (rows.length === 0) return undefined;
    return this.rowToEntry(rows[0]);
  }

  async search(opts: {
    query?: string;
    types?: string[];
    domain?: string;
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredKnowledgeUnit>> {
    const conditions: string[] = [
      "(quarantine_status IS NULL OR quarantine_status != 'quarantined')",
    ];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.types?.length) {
      conditions.push(`unit_json->>'@type' = ANY($${paramIndex})`);
      params.push(opts.types);
      paramIndex++;
    }

    if (opts.domain) {
      conditions.push(`LOWER(unit_json->'metadata'->>'task_domain') = LOWER($${paramIndex})`);
      params.push(opts.domain);
      paramIndex++;
    }

    if (opts.min_quality !== undefined) {
      conditions.push(`(unit_json->'metadata'->>'quality_score')::real >= $${paramIndex}`);
      params.push(opts.min_quality);
      paramIndex++;
    }

    let useFullText = false;
    let queryParamIndex = -1;

    if (opts.query) {
      if (opts.query.length < 2) {
        // Short queries: fall back to ILIKE
        const pattern = `%${opts.query}%`;
        conditions.push(
          `(unit_json->>'@type' ILIKE $${paramIndex} OR unit_json->'metadata'->>'task_domain' ILIKE $${paramIndex})`,
        );
        params.push(pattern);
        paramIndex++;
      } else {
        // Full-text search using tsvector/tsquery
        useFullText = true;
        queryParamIndex = paramIndex;
        conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
        params.push(opts.query);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const { rows: countRows } = await this.pool.query(
      `SELECT COUNT(*) AS total FROM knowledge_units ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countRows[0].total, 10);

    // Get paginated data
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;

    // When full-text search is active, order by ts_rank relevance; otherwise by quality_score
    let selectClause: string;
    let orderClause: string;
    if (useFullText) {
      selectClause = `SELECT *, ts_rank(search_vector, plainto_tsquery('english', $${queryParamIndex})) AS rank`;
      orderClause = "ORDER BY rank DESC";
    } else {
      selectClause = "SELECT *";
      orderClause = `ORDER BY (unit_json->'metadata'->>'quality_score')::real DESC`;
    }

    const dataQuery = `${selectClause} FROM knowledge_units ${whereClause}
      ${orderClause}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`;
    const { rows } = await this.pool.query(dataQuery, [...params, offset, limit]);

    const data = rows.map((row: Record<string, unknown>) => this.rowToEntry(row));

    return { data, total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query("DELETE FROM knowledge_units WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getByAgentId(agentId: string): Promise<StoredKnowledgeUnit[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM knowledge_units WHERE unit_json->'metadata'->>'agent_id' = $1`,
      [agentId],
    );
    return rows.map((row: Record<string, unknown>) => this.rowToEntry(row));
  }

  async setQuarantineStatus(id: string, status: QuarantineStatus): Promise<void> {
    await this.pool.query("UPDATE knowledge_units SET quarantine_status = $2 WHERE id = $1", [
      id,
      status,
    ]);
  }

  async getQuarantineStatus(id: string): Promise<QuarantineStatus> {
    const { rows } = await this.pool.query(
      "SELECT quarantine_status FROM knowledge_units WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return null;
    return (rows[0].quarantine_status as QuarantineStatus) ?? null;
  }

  private rowToEntry(row: Record<string, unknown>): StoredKnowledgeUnit {
    // pg driver auto-parses JSONB, but handle string case too
    let unit: StoredKnowledgeUnit["unit"];
    if (typeof row.unit_json === "string") {
      unit = JSON.parse(row.unit_json);
    } else {
      unit = row.unit_json as StoredKnowledgeUnit["unit"];
    }

    return {
      id: row.id as string,
      unit,
      visibility: row.visibility as StoredKnowledgeUnit["visibility"],
      created_at:
        row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string),
      updated_at:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at as string),
    };
  }
}
