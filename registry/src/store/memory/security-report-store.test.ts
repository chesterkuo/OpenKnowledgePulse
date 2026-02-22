import { beforeEach, describe, expect, test } from "bun:test";
import { MemorySecurityReportStore } from "./security-report-store.js";

describe("MemorySecurityReportStore", () => {
  let store: MemorySecurityReportStore;

  beforeEach(() => {
    store = new MemorySecurityReportStore();
  });

  describe("report", () => {
    test("creates a security report with id, unit_id, reporter_id, reason, created_at", async () => {
      const report = await store.report("unit-1", "agent-a", "spam content");

      expect(report.id).toMatch(/^kp:sr:/);
      expect(report.unit_id).toBe("unit-1");
      expect(report.reporter_id).toBe("agent-a");
      expect(report.reason).toBe("spam content");
      expect(report.created_at).toBeTruthy();
      // created_at should be a valid ISO date
      expect(new Date(report.created_at).toISOString()).toBe(report.created_at);
    });

    test("deduplication: one report per agent per unit (second report updates, doesn't create new)", async () => {
      const first = await store.report("unit-1", "agent-a", "reason 1");
      const second = await store.report("unit-1", "agent-a", "reason 2");

      // Same id should be returned
      expect(second.id).toBe(first.id);
      // Reason should be updated
      expect(second.reason).toBe("reason 2");
      // Only one report should exist
      const reports = await store.getReportsForUnit("unit-1");
      expect(reports).toHaveLength(1);
    });

    test("multiple agents can report same unit", async () => {
      await store.report("unit-1", "agent-a", "spam");
      await store.report("unit-1", "agent-b", "plagiarism");
      await store.report("unit-1", "agent-c", "offensive");

      const reports = await store.getReportsForUnit("unit-1");
      expect(reports).toHaveLength(3);

      const reporters = reports.map((r) => r.reporter_id).sort();
      expect(reporters).toEqual(["agent-a", "agent-b", "agent-c"]);
    });
  });

  describe("getReportsForUnit", () => {
    test("returns empty for unknown unit", async () => {
      const reports = await store.getReportsForUnit("nonexistent");
      expect(reports).toHaveLength(0);
    });

    test("returns only reports for the specified unit", async () => {
      await store.report("unit-1", "agent-a", "spam");
      await store.report("unit-2", "agent-a", "plagiarism");
      await store.report("unit-1", "agent-b", "offensive");

      const reports = await store.getReportsForUnit("unit-1");
      expect(reports).toHaveLength(2);
      expect(reports.every((r) => r.unit_id === "unit-1")).toBe(true);
    });
  });

  describe("getReportCount", () => {
    test("returns correct count", async () => {
      expect(await store.getReportCount("unit-1")).toBe(0);

      await store.report("unit-1", "agent-a", "spam");
      expect(await store.getReportCount("unit-1")).toBe(1);

      await store.report("unit-1", "agent-b", "plagiarism");
      expect(await store.getReportCount("unit-1")).toBe(2);

      // Duplicate should not increase count
      await store.report("unit-1", "agent-a", "updated reason");
      expect(await store.getReportCount("unit-1")).toBe(2);
    });
  });

  describe("getAllReported", () => {
    test("returns units with reports", async () => {
      await store.report("unit-1", "agent-a", "spam");
      await store.report("unit-1", "agent-b", "spam");
      await store.report("unit-2", "agent-a", "plagiarism");

      const reported = await store.getAllReported();
      expect(reported).toHaveLength(2);

      const unit1 = reported.find((r) => r.unit_id === "unit-1");
      expect(unit1).toBeDefined();
      expect(unit1!.count).toBe(2);
      expect(unit1!.status).toBeNull();

      const unit2 = reported.find((r) => r.unit_id === "unit-2");
      expect(unit2).toBeDefined();
      expect(unit2!.count).toBe(1);
      expect(unit2!.status).toBeNull();
    });

    test("returns empty array when no reports exist", async () => {
      const reported = await store.getAllReported();
      expect(reported).toHaveLength(0);
    });
  });

  describe("resolve", () => {
    test("resolve('cleared') clears all reports for unit", async () => {
      await store.report("unit-1", "agent-a", "spam");
      await store.report("unit-1", "agent-b", "plagiarism");
      await store.report("unit-2", "agent-a", "offensive");

      await store.resolve("unit-1", "cleared");

      // unit-1 reports should be gone
      expect(await store.getReportCount("unit-1")).toBe(0);
      expect(await store.getReportsForUnit("unit-1")).toHaveLength(0);

      // unit-2 should be unaffected
      expect(await store.getReportCount("unit-2")).toBe(1);
    });

    test("resolve('removed') clears all reports for unit", async () => {
      await store.report("unit-1", "agent-a", "spam");
      await store.report("unit-1", "agent-b", "plagiarism");

      await store.resolve("unit-1", "removed");

      expect(await store.getReportCount("unit-1")).toBe(0);
      expect(await store.getReportsForUnit("unit-1")).toHaveLength(0);
    });

    test("resolve on unit with no reports is a no-op", async () => {
      // Should not throw
      await store.resolve("nonexistent", "cleared");
      expect(await store.getReportCount("nonexistent")).toBe(0);
    });
  });
});
