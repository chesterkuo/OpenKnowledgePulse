import { beforeEach, describe, expect, test } from "bun:test";
import { MemorySubscriptionStore } from "./subscription-store.js";

describe("MemorySubscriptionStore", () => {
  let store: MemorySubscriptionStore;
  beforeEach(() => {
    store = new MemorySubscriptionStore();
  });

  test("subscribe creates a subscription record", async () => {
    const sub = await store.subscribe("agent-1", "devops", 50);
    expect(sub.agent_id).toBe("agent-1");
    expect(sub.domain).toBe("devops");
    expect(sub.credits_per_month).toBe(50);
    expect(sub.status).toBe("active");
    expect(sub.id).toBeTruthy();
  });

  test("subscribe deduplicates by agent+domain", async () => {
    const _sub1 = await store.subscribe("agent-1", "devops", 50);
    const _sub2 = await store.subscribe("agent-1", "devops", 75);
    // Should update existing, not create new
    const active = await store.getActive("agent-1");
    expect(active).toHaveLength(1);
    expect(active[0].credits_per_month).toBe(75);
  });

  test("unsubscribe cancels subscription", async () => {
    const sub = await store.subscribe("agent-1", "devops", 50);
    const cancelled = await store.unsubscribe(sub.id);
    expect(cancelled).toBe(true);
    const active = await store.getActive("agent-1");
    expect(active).toHaveLength(0);
  });

  test("unsubscribe returns false for unknown id", async () => {
    expect(await store.unsubscribe("unknown")).toBe(false);
  });

  test("getActive returns only active subscriptions", async () => {
    await store.subscribe("agent-1", "devops", 50);
    await store.subscribe("agent-1", "security", 30);
    const sub3 = await store.subscribe("agent-1", "ml", 40);
    await store.unsubscribe(sub3.id);
    const active = await store.getActive("agent-1");
    expect(active).toHaveLength(2);
  });

  test("hasAccess returns true for active subscription", async () => {
    await store.subscribe("agent-1", "devops", 50);
    expect(await store.hasAccess("agent-1", "devops")).toBe(true);
  });

  test("hasAccess returns false for no subscription", async () => {
    expect(await store.hasAccess("agent-1", "devops")).toBe(false);
  });

  test("hasAccess returns false for cancelled subscription", async () => {
    const sub = await store.subscribe("agent-1", "devops", 50);
    await store.unsubscribe(sub.id);
    expect(await store.hasAccess("agent-1", "devops")).toBe(false);
  });

  test("getById returns subscription by id", async () => {
    const sub = await store.subscribe("agent-1", "devops", 50);
    const found = await store.getById(sub.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(sub.id);
  });

  test("getById returns undefined for unknown id", async () => {
    expect(await store.getById("unknown")).toBeUndefined();
  });

  test("getActive returns empty array for unknown agent", async () => {
    expect(await store.getActive("unknown")).toEqual([]);
  });
});
