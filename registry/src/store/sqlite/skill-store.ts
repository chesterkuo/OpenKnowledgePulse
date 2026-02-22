import type { Database } from "bun:sqlite";
import type { PaginatedResult, PaginationOpts, SkillStore, StoredSkill } from "../interfaces.js";

export class SqliteSkillStore implements SkillStore {
  constructor(private db: Database) {}

  async create(skill: StoredSkill): Promise<StoredSkill> {
    this.db
      .query(
        `INSERT OR REPLACE INTO skills (id, name, description, version, author, tags, content, visibility, quality_score, created_at, updated_at)
         VALUES ($id, $name, $description, $version, $author, $tags, $content, $visibility, $quality_score, $created_at, $updated_at)`,
      )
      .run({
        $id: skill.id,
        $name: skill.name,
        $description: skill.description,
        $version: skill.version ?? null,
        $author: skill.author ?? null,
        $tags: JSON.stringify(skill.tags),
        $content: skill.content,
        $visibility: skill.visibility,
        $quality_score: skill.quality_score,
        $created_at: skill.created_at,
        $updated_at: skill.updated_at,
      });
    return skill;
  }

  async getById(id: string): Promise<StoredSkill | undefined> {
    const row = this.db.query("SELECT * FROM skills WHERE id = $id").get({ $id: id }) as Record<
      string,
      unknown
    > | null;
    if (!row) return undefined;
    return this.rowToSkill(row);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSkill>> {
    // Build WHERE clauses
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (opts.query) {
      const q = `%${opts.query.toLowerCase()}%`;
      conditions.push("(LOWER(name) LIKE $query OR LOWER(description) LIKE $query OR LOWER(tags) LIKE $query)");
      params.$query = q;
    }

    if (opts.min_quality !== undefined) {
      conditions.push("quality_score >= $min_quality");
      params.$min_quality = opts.min_quality;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get all matching results (we filter tags in JS for exact matching)
    const rows = this.db
      .query(`SELECT * FROM skills ${whereClause} ORDER BY quality_score DESC`)
      .all(params) as Record<string, unknown>[];

    let results = rows.map((row) => this.rowToSkill(row));

    // Filter by tags in JS for exact matching
    if (opts.tags?.length) {
      const tagSet = new Set(opts.tags.map((t) => t.toLowerCase()));
      results = results.filter((s) => s.tags.some((t) => tagSet.has(t.toLowerCase())));
    }

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.query("DELETE FROM skills WHERE id = $id").run({ $id: id });
    return result.changes > 0;
  }

  private rowToSkill(row: Record<string, unknown>): StoredSkill {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      version: (row.version as string) ?? undefined,
      author: (row.author as string) ?? undefined,
      tags: JSON.parse(row.tags as string) as string[],
      content: row.content as string,
      visibility: row.visibility as StoredSkill["visibility"],
      quality_score: row.quality_score as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
