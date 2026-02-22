import { beforeEach, describe, expect, test } from "bun:test";
import type { AuditLogEntry } from "../interfaces.js";
import { MemoryAuditLogStore } from "./audit-log-store.js";

describe("MemoryAuditLogStore", () => {
  let store: MemoryAuditLogStore;

  beforeEach(() => {
    store = new MemoryAuditLogStore();
  });

  describe("log and query by agentId", () => {
    test("should log an entry and query it by agentId", async () => {
      await store.log({
        action: "create",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/abc",
        ip: "127.0.0.1",
      });

      await store.log({
        action: "read",
        agentId: "agent-2",
        resourceType: "knowledge",
        resourceId: "/v1/knowledge/xyz",
        ip: "192.168.1.1",
      });

      const results = await store.query({ agentId: "agent-1" });
      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe("agent-1");
      expect(results[0].action).toBe("create");
      expect(results[0].resourceType).toBe("skill");
      expect(results[0].id).toBeDefined();
      expect(results[0].timestamp).toBeDefined();
    });
  });

  describe("query by action type", () => {
    test("should filter entries by action", async () => {
      await store.log({
        action: "create",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/a",
        ip: "127.0.0.1",
      });

      await store.log({
        action: "read",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/b",
        ip: "127.0.0.1",
      });

      await store.log({
        action: "delete",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/c",
        ip: "127.0.0.1",
      });

      const reads = await store.query({ action: "read" });
      expect(reads).toHaveLength(1);
      expect(reads[0].action).toBe("read");

      const creates = await store.query({ action: "create" });
      expect(creates).toHaveLength(1);
      expect(creates[0].action).toBe("create");
    });
  });

  describe("query by date range", () => {
    test("should filter entries by from and to dates", async () => {
      const entry1: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "create",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/a",
        timestamp: "2026-01-01T00:00:00.000Z",
        ip: "127.0.0.1",
      };

      const entry2: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "read",
        agentId: "agent-1",
        resourceType: "knowledge",
        resourceId: "/v1/knowledge/b",
        timestamp: "2026-01-15T00:00:00.000Z",
        ip: "127.0.0.1",
      };

      const entry3: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "update",
        agentId: "agent-1",
        resourceType: "skill",
        resourceId: "/v1/skills/c",
        timestamp: "2026-02-01T00:00:00.000Z",
        ip: "127.0.0.1",
      };

      store._injectForTest(entry1);
      store._injectForTest(entry2);
      store._injectForTest(entry3);

      const results = await store.query({
        from: "2026-01-10T00:00:00.000Z",
        to: "2026-01-20T00:00:00.000Z",
      });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("read");

      const allAfterJan = await store.query({
        from: "2026-01-01T00:00:00.000Z",
      });
      expect(allAfterJan).toHaveLength(3);

      const allBeforeFeb = await store.query({
        to: "2026-01-31T23:59:59.999Z",
      });
      expect(allBeforeFeb).toHaveLength(2);
    });
  });

  describe("90-day retention enforcement", () => {
    test("should purge entries older than 90 days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91); // 91 days ago

      const oldEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "create",
        agentId: "agent-old",
        resourceType: "skill",
        resourceId: "/v1/skills/old",
        timestamp: oldDate.toISOString(),
        ip: "127.0.0.1",
      };

      const recentEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "read",
        agentId: "agent-recent",
        resourceType: "knowledge",
        resourceId: "/v1/knowledge/recent",
        timestamp: new Date().toISOString(),
        ip: "127.0.0.1",
      };

      store._injectForTest(oldEntry);
      store._injectForTest(recentEntry);

      // Query should trigger purge of the old entry
      const results = await store.query({});
      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe("agent-recent");
    });

    test("should keep entries within the 90-day window", async () => {
      const borderlineDate = new Date();
      borderlineDate.setDate(borderlineDate.getDate() - 89); // 89 days ago, within window

      const borderlineEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        action: "validate",
        agentId: "agent-border",
        resourceType: "skill",
        resourceId: "/v1/skills/border",
        timestamp: borderlineDate.toISOString(),
        ip: "127.0.0.1",
      };

      store._injectForTest(borderlineEntry);

      const results = await store.query({});
      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe("agent-border");
    });
  });
});
