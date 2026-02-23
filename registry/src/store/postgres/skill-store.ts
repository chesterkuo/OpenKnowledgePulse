import type { PaginatedResult, PaginationOpts, SkillStore, StoredSkill } from "../interfaces.js";
import type { PgPool } from "./db.js";

export class PgSkillStore implements SkillStore {
  constructor(private pool: PgPool) {}

  async create(skill: StoredSkill): Promise<StoredSkill> {
    await this.pool.query(
      `INSERT INTO skills (id, name, description, version, author, tags, content, files, visibility, quality_score, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         version = EXCLUDED.version,
         author = EXCLUDED.author,
         tags = EXCLUDED.tags,
         content = EXCLUDED.content,
         files = EXCLUDED.files,
         visibility = EXCLUDED.visibility,
         quality_score = EXCLUDED.quality_score,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at`,
      [
        skill.id,
        skill.name,
        skill.description,
        skill.version ?? null,
        skill.author ?? null,
        JSON.stringify(skill.tags),
        skill.content,
        JSON.stringify(skill.files ?? {}),
        skill.visibility,
        skill.quality_score,
        skill.created_at,
        skill.updated_at,
      ],
    );
    return skill;
  }

  async getById(id: string): Promise<StoredSkill | undefined> {
    const { rows } = await this.pool.query("SELECT * FROM skills WHERE id = $1", [id]);
    if (rows.length === 0) return undefined;
    return this.rowToSkill(rows[0]);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSkill>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    let useFullText = false;
    let queryParamIndex = -1;

    if (opts.query) {
      if (opts.query.length < 2) {
        // Short queries: fall back to ILIKE
        const pattern = `%${opts.query}%`;
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
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

    if (opts.tags?.length) {
      // Use the ?| operator to check if the JSONB array overlaps with the provided tags
      // tags is stored as JSONB array e.g. '["react","frontend"]'
      // ?| checks if any of the provided keys exist as top-level elements
      conditions.push(`tags ?| $${paramIndex}`);
      params.push(opts.tags);
      paramIndex++;
    }

    if (opts.min_quality !== undefined) {
      conditions.push(`quality_score >= $${paramIndex}`);
      params.push(opts.min_quality);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) AS total FROM skills ${whereClause}`;
    const { rows: countRows } = await this.pool.query(countQuery, params);
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
      orderClause = "ORDER BY quality_score DESC";
    }

    const dataQuery = `${selectClause} FROM skills ${whereClause} ${orderClause} OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`;
    const dataParams = [...params, offset, limit];
    const { rows } = await this.pool.query(dataQuery, dataParams);

    const data = rows.map((row: Record<string, unknown>) => this.rowToSkill(row));

    return { data, total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query("DELETE FROM skills WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  private rowToSkill(row: Record<string, unknown>): StoredSkill {
    // Tags come back as a parsed JS array from JSONB (pg driver auto-parses JSONB)
    // but we need to handle both cases: already-parsed array or string
    let tags: string[];
    if (typeof row.tags === "string") {
      tags = JSON.parse(row.tags) as string[];
    } else if (Array.isArray(row.tags)) {
      tags = row.tags as string[];
    } else {
      tags = [];
    }

    // Parse files JSONB — handle string (JSON.parse) or object (direct), default {}
    let files: Record<string, string> | undefined;
    if (typeof row.files === "string") {
      try {
        files = JSON.parse(row.files) as Record<string, string>;
      } catch {
        files = {};
      }
    } else if (row.files && typeof row.files === "object") {
      files = row.files as Record<string, string>;
    }
    // Only include files if non-empty
    const hasFiles = files && Object.keys(files).length > 0;

    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      version: (row.version as string) ?? undefined,
      author: (row.author as string) ?? undefined,
      tags,
      content: row.content as string,
      ...(hasFiles ? { files } : {}),
      visibility: row.visibility as StoredSkill["visibility"],
      quality_score: row.quality_score as number,
      created_at:
        row.created_at instanceof Date
          ? (row.created_at as Date).toISOString()
          : (row.created_at as string),
      updated_at:
        row.updated_at instanceof Date
          ? (row.updated_at as Date).toISOString()
          : (row.updated_at as string),
    };
  }
}
