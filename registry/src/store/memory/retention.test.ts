import { describe, expect, test } from "bun:test";
import type { StoredKnowledgeUnit } from "../interfaces.js";
import { createMemoryStore } from "./index.js";
import { RetentionManager } from "./retention.js";

const KP_CONTEXT = "https://knowledgepulse.dev/schema/v1" as const;

function makeEntry(
  id: string,
  visibility: "network" | "org" | "private",
  createdAt: string,
): StoredKnowledgeUnit {
  return {
    id,
    unit: {
      "@context": KP_CONTEXT,
      "@type": "ReasoningTrace",
      id,
      metadata: {
        created_at: createdAt,
        task_domain: "test",
        success: true,
        quality_score: 0.8,
        visibility,
        privacy_level: "aggregated" as const,
      },
      task: { objective: "Test" },
      steps: [{ step_id: 0, type: "thought" as const, content: "x" }],
      outcome: { result_summary: "Done", confidence: 0.9 },
    },
    visibility,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

describe("RetentionManager", () => {
  test("sweep deletes expired private units", async () => {
    const stores = createMemoryStore();
    const manager = new RetentionManager(stores, { privateDays: 1 });

    // Create a private unit that is 2 days old (expired)
    const expired = makeEntry("kp:trace:expired-private", "private", daysAgo(2));
    await stores.knowledge.create(expired);

    const swept = await manager.runSweep();

    expect(swept).toBe(1);
    const result = await stores.knowledge.getById("kp:trace:expired-private");
    expect(result).toBeUndefined();
  });

  test("sweep keeps non-expired units", async () => {
    const stores = createMemoryStore();
    const manager = new RetentionManager(stores, { privateDays: 1 });

    // Create a private unit that was just created (not expired)
    const fresh = makeEntry("kp:trace:fresh-private", "private", new Date().toISOString());
    await stores.knowledge.create(fresh);

    const swept = await manager.runSweep();

    expect(swept).toBe(0);
    const result = await stores.knowledge.getById("kp:trace:fresh-private");
    expect(result).toBeDefined();
  });

  test("sweep keeps network units with permanent retention", async () => {
    const stores = createMemoryStore();
    // networkDays=null means permanent retention
    const manager = new RetentionManager(stores, { networkDays: null });

    // Create a network unit that is 365 days old
    const old = makeEntry("kp:trace:old-network", "network", daysAgo(365));
    await stores.knowledge.create(old);

    const swept = await manager.runSweep();

    expect(swept).toBe(0);
    const result = await stores.knowledge.getById("kp:trace:old-network");
    expect(result).toBeDefined();
  });

  test("sweep deletes expired org units but keeps non-expired", async () => {
    const stores = createMemoryStore();
    const manager = new RetentionManager(stores, { orgDays: 2 });

    const expired = makeEntry("kp:trace:expired-org", "org", daysAgo(3));
    const fresh = makeEntry("kp:trace:fresh-org", "org", daysAgo(1));
    await stores.knowledge.create(expired);
    await stores.knowledge.create(fresh);

    const swept = await manager.runSweep();

    expect(swept).toBe(1);
    expect(await stores.knowledge.getById("kp:trace:expired-org")).toBeUndefined();
    expect(await stores.knowledge.getById("kp:trace:fresh-org")).toBeDefined();
  });

  test("sweep handles mixed visibility tiers correctly", async () => {
    const stores = createMemoryStore();
    const manager = new RetentionManager(stores, {
      networkDays: null,
      orgDays: 2,
      privateDays: 1,
    });

    // Network unit 100 days old: should be kept (permanent)
    await stores.knowledge.create(makeEntry("kp:trace:net-old", "network", daysAgo(100)));
    // Org unit 3 days old: should be deleted (orgDays=2)
    await stores.knowledge.create(makeEntry("kp:trace:org-expired", "org", daysAgo(3)));
    // Private unit 0.5 days old: should be kept (privateDays=1)
    await stores.knowledge.create(
      makeEntry("kp:trace:priv-fresh", "private", new Date().toISOString()),
    );
    // Private unit 2 days old: should be deleted (privateDays=1)
    await stores.knowledge.create(makeEntry("kp:trace:priv-expired", "private", daysAgo(2)));

    const swept = await manager.runSweep();

    expect(swept).toBe(2);
    expect(await stores.knowledge.getById("kp:trace:net-old")).toBeDefined();
    expect(await stores.knowledge.getById("kp:trace:org-expired")).toBeUndefined();
    expect(await stores.knowledge.getById("kp:trace:priv-fresh")).toBeDefined();
    expect(await stores.knowledge.getById("kp:trace:priv-expired")).toBeUndefined();
  });
});
