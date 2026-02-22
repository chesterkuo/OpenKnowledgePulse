import type { Database } from "bun:sqlite";
import type {
  KnowledgeStore,
  PaginatedResult,
  PaginationOpts,
  StoredKnowledgeUnit,
} from "../interfaces.js";

export class SqliteKnowledgeStore implements KnowledgeStore {
  constructor(private db: Database) {}

  async create(entry: StoredKnowledgeUnit): Promise<StoredKnowledgeUnit> {
    this.db
      .query(
        `INSERT OR REPLACE INTO knowledge_units (id, unit_json, visibility, created_at, updated_at)
         VALUES ($id, $unit_json, $visibility, $created_at, $updated_at)`,
      )
      .run({
        $id: entry.id,
        $unit_json: JSON.stringify(entry.unit),
        $visibility: entry.visibility,
        $created_at: entry.created_at,
        $updated_at: entry.updated_at,
      });
    return entry;
  }

  async getById(id: string): Promise<StoredKnowledgeUnit | undefined> {
    const row = this.db
      .query("SELECT * FROM knowledge_units WHERE id = $id")
      .get({ $id: id }) as Record<string, unknown> | null;
    if (!row) return undefined;
    return this.rowToEntry(row);
  }

  async search(opts: {
    query?: string;
    types?: string[];
    domain?: string;
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredKnowledgeUnit>> {
    // Load all rows and filter in JS (same logic as memory store)
    const rows = this.db.query("SELECT * FROM knowledge_units").all() as Record<string, unknown>[];
    let results = rows.map((row) => this.rowToEntry(row));

    if (opts.types?.length) {
      const typeSet = new Set(opts.types);
      results = results.filter((e) => typeSet.has(e.unit["@type"]));
    }

    if (opts.domain) {
      const domain = opts.domain.toLowerCase();
      results = results.filter((e) => e.unit.metadata.task_domain.toLowerCase() === domain);
    }

    if (opts.min_quality !== undefined) {
      results = results.filter((e) => e.unit.metadata.quality_score >= opts.min_quality!);
    }

    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter((e) => {
        const unit = e.unit;
        if (unit["@type"] === "ReasoningTrace") {
          return (
            unit.task.objective.toLowerCase().includes(q) ||
            unit.steps.some((s) => s.content?.toLowerCase().includes(q))
          );
        }
        if (unit["@type"] === "ToolCallPattern") {
          return unit.name.toLowerCase().includes(q) || unit.description.toLowerCase().includes(q);
        }
        if (unit["@type"] === "ExpertSOP") {
          return unit.name.toLowerCase().includes(q) || unit.domain.toLowerCase().includes(q);
        }
        return false;
      });
    }

    // Sort by quality score descending
    results.sort((a, b) => b.unit.metadata.quality_score - a.unit.metadata.quality_score);

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.query("DELETE FROM knowledge_units WHERE id = $id").run({ $id: id });
    return result.changes > 0;
  }

  async getByAgentId(agentId: string): Promise<StoredKnowledgeUnit[]> {
    // Load all and filter in JS since agent_id is inside the JSON
    const rows = this.db.query("SELECT * FROM knowledge_units").all() as Record<string, unknown>[];
    return rows
      .map((row) => this.rowToEntry(row))
      .filter((e) => e.unit.metadata.agent_id === agentId);
  }

  private rowToEntry(row: Record<string, unknown>): StoredKnowledgeUnit {
    return {
      id: row.id as string,
      unit: JSON.parse(row.unit_json as string),
      visibility: row.visibility as StoredKnowledgeUnit["visibility"],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
