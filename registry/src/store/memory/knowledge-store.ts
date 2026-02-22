import type {
  KnowledgeStore,
  PaginatedResult,
  PaginationOpts,
  QuarantineStatus,
  StoredKnowledgeUnit,
} from "../interfaces.js";

export class MemoryKnowledgeStore implements KnowledgeStore {
  private units = new Map<string, StoredKnowledgeUnit>();
  private quarantineStatuses = new Map<string, QuarantineStatus>();

  async create(entry: StoredKnowledgeUnit): Promise<StoredKnowledgeUnit> {
    this.units.set(entry.id, entry);
    return entry;
  }

  async getById(id: string): Promise<StoredKnowledgeUnit | undefined> {
    return this.units.get(id);
  }

  async search(opts: {
    query?: string;
    types?: string[];
    domain?: string;
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredKnowledgeUnit>> {
    let results = Array.from(this.units.values());

    // Filter out quarantined units
    results = results.filter((e) => {
      const status = this.quarantineStatuses.get(e.id);
      return !status || status !== "quarantined";
    });

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
    return this.units.delete(id);
  }

  async getByAgentId(agentId: string): Promise<StoredKnowledgeUnit[]> {
    return Array.from(this.units.values()).filter((e) => e.unit.metadata.agent_id === agentId);
  }

  async setQuarantineStatus(id: string, status: QuarantineStatus): Promise<void> {
    if (status === null) {
      this.quarantineStatuses.delete(id);
    } else {
      this.quarantineStatuses.set(id, status);
    }
  }

  async getQuarantineStatus(id: string): Promise<QuarantineStatus> {
    return this.quarantineStatuses.get(id) ?? null;
  }
}
