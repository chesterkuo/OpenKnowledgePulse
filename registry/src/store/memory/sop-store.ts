import type {
  PaginatedResult,
  PaginationOpts,
  SOPVersion,
  SopStore,
  StoredSOP,
} from "../interfaces.js";

export class MemorySopStore implements SopStore {
  private sops = new Map<string, StoredSOP>();
  private versions = new Map<string, SOPVersion[]>();

  async create(sop: StoredSOP): Promise<StoredSOP> {
    this.sops.set(sop.id, sop);
    return sop;
  }

  async getById(id: string): Promise<StoredSOP | undefined> {
    return this.sops.get(id);
  }

  async search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>> {
    let results = Array.from(this.sops.values());

    // Filter by domain
    if (opts.domain) {
      const domain = opts.domain.toLowerCase();
      results = results.filter((s) => s.sop.domain.toLowerCase() === domain);
    }

    // Filter by status
    if (opts.status) {
      results = results.filter((s) => s.status === opts.status);
    }

    // Text-based search on name, domain, and decision tree content
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter((s) => {
        if (s.sop.name.toLowerCase().includes(q)) return true;
        if (s.sop.domain.toLowerCase().includes(q)) return true;
        if (
          s.sop.decision_tree.some(
            (dt) =>
              dt.step.toLowerCase().includes(q) ||
              dt.instruction.toLowerCase().includes(q),
          )
        )
          return true;
        return false;
      });
    }

    // Sort by quality_score descending
    results.sort(
      (a, b) => b.sop.metadata.quality_score - a.sop.metadata.quality_score,
    );

    const total = results.length;
    const offset = opts.pagination?.offset ?? 0;
    const limit = opts.pagination?.limit ?? 20;
    const data = results.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async update(
    id: string,
    updates: Partial<StoredSOP>,
  ): Promise<StoredSOP | undefined> {
    const existing = this.sops.get(id);
    if (!existing) return undefined;

    const updated: StoredSOP = { ...existing, ...updates };
    this.sops.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.sops.delete(id);
  }

  async getVersions(id: string): Promise<SOPVersion[]> {
    return this.versions.get(id) ?? [];
  }

  async addVersion(version: SOPVersion): Promise<void> {
    const existing = this.versions.get(version.sop_id);
    if (existing) {
      existing.push(version);
    } else {
      this.versions.set(version.sop_id, [version]);
    }
  }

  async getByDomain(domain: string): Promise<StoredSOP[]> {
    const d = domain.toLowerCase();
    return Array.from(this.sops.values()).filter(
      (s) => s.sop.domain.toLowerCase() === d,
    );
  }
}
