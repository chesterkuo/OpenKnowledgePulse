import type {
  QuarantineStatus,
  SecurityReport,
  SecurityReportStore,
} from "../interfaces.js";

export class MemorySecurityReportStore implements SecurityReportStore {
  private reports = new Map<string, SecurityReport>();
  private quarantineStatuses = new Map<string, QuarantineStatus>();

  async report(
    unitId: string,
    reporterId: string,
    reason: string,
  ): Promise<SecurityReport> {
    const dedupKey = `${unitId}:${reporterId}`;
    const existing = this.reports.get(dedupKey);

    if (existing) {
      // Update the existing report's reason
      existing.reason = reason;
      return existing;
    }

    const report: SecurityReport = {
      id: `kp:sr:${crypto.randomUUID()}`,
      unit_id: unitId,
      reporter_id: reporterId,
      reason,
      created_at: new Date().toISOString(),
    };
    this.reports.set(dedupKey, report);
    return report;
  }

  async getReportsForUnit(unitId: string): Promise<SecurityReport[]> {
    return Array.from(this.reports.values()).filter(
      (r) => r.unit_id === unitId,
    );
  }

  async getReportCount(unitId: string): Promise<number> {
    return Array.from(this.reports.values()).filter(
      (r) => r.unit_id === unitId,
    ).length;
  }

  async getAllReported(): Promise<
    Array<{ unit_id: string; count: number; status: QuarantineStatus }>
  > {
    const counts = new Map<string, number>();
    for (const report of this.reports.values()) {
      counts.set(report.unit_id, (counts.get(report.unit_id) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([unit_id, count]) => ({
      unit_id,
      count,
      status: this.quarantineStatuses.get(unit_id) ?? null,
    }));
  }

  async resolve(unitId: string, _verdict: "cleared" | "removed"): Promise<void> {
    // Remove all reports for the unit
    for (const [key, report] of this.reports.entries()) {
      if (report.unit_id === unitId) {
        this.reports.delete(key);
      }
    }
  }

  // Expose quarantine status map for use by MemoryKnowledgeStore
  getQuarantineStatusMap(): Map<string, QuarantineStatus> {
    return this.quarantineStatuses;
  }
}
