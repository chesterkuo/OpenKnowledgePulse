import type { AuditAction, AuditLogEntry, AuditLogStore } from "../interfaces.js";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export class MemoryAuditLogStore implements AuditLogStore {
  private entries: AuditLogEntry[] = [];

  async log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
    this.purgeExpired();
    this.entries.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  async query(opts: {
    agentId?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
  }): Promise<AuditLogEntry[]> {
    this.purgeExpired();
    let results = [...this.entries];
    if (opts.agentId) results = results.filter((e) => e.agentId === opts.agentId);
    if (opts.action) results = results.filter((e) => e.action === opts.action);
    if (opts.from) {
      const fromMs = new Date(opts.from).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() >= fromMs);
    }
    if (opts.to) {
      const toMs = new Date(opts.to).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() <= toMs);
    }
    return results;
  }

  _injectForTest(entry: AuditLogEntry): void {
    this.entries.push(entry);
  }

  private purgeExpired(): void {
    const cutoff = Date.now() - RETENTION_MS;
    this.entries = this.entries.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }
}
