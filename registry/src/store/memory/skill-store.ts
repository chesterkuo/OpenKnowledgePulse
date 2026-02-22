import type { PaginatedResult, PaginationOpts, SkillStore, StoredSkill } from "../interfaces.js";

export class MemorySkillStore implements SkillStore {
  private skills = new Map<string, StoredSkill>();

  async create(skill: StoredSkill): Promise<StoredSkill> {
    this.skills.set(skill.id, skill);
    return skill;
  }

  async getById(id: string): Promise<StoredSkill | undefined> {
    return this.skills.get(id);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSkill>> {
    let results = Array.from(this.skills.values());

    // Text-based search on name, description, tags
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (opts.min_quality !== undefined) {
      results = results.filter((s) => s.quality_score >= opts.min_quality!);
    }

    if (opts.tags?.length) {
      const tagSet = new Set(opts.tags.map((t) => t.toLowerCase()));
      results = results.filter((s) => s.tags.some((t) => tagSet.has(t.toLowerCase())));
    }

    // Sort by quality_score descending
    results.sort((a, b) => b.quality_score - a.quality_score);

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async delete(id: string): Promise<boolean> {
    return this.skills.delete(id);
  }
}
