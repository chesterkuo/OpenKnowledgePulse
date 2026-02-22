import { beforeEach, describe, expect, test } from "bun:test";
import type { ValidationVote } from "@knowledgepulse/sdk";
import { MemoryReputationStore } from "./reputation-store.js";

describe("MemoryReputationStore", () => {
  let store: MemoryReputationStore;

  beforeEach(() => {
    store = new MemoryReputationStore();
  });

  // ── Existing behaviour ──────────────────────────────────

  describe("get / upsert / getAll", () => {
    test("should return undefined for unknown agent", async () => {
      expect(await store.get("unknown")).toBeUndefined();
    });

    test("upsert creates a new record", async () => {
      const rec = await store.upsert("agent-1", 10, "contribution");
      expect(rec.agent_id).toBe("agent-1");
      expect(rec.score).toBe(10);
      expect(rec.contributions).toBe(1);
    });

    test("upsert updates an existing record", async () => {
      await store.upsert("agent-1", 10, "first");
      const rec = await store.upsert("agent-1", 5, "second");
      expect(rec.score).toBe(15);
      expect(rec.contributions).toBe(2);
      expect(rec.history).toHaveLength(2);
    });

    test("getAll returns all records", async () => {
      await store.upsert("a", 1, "x");
      await store.upsert("b", 2, "y");
      const all = await store.getAll();
      expect(all).toHaveLength(2);
    });
  });

  // ── Leaderboard ─────────────────────────────────────────

  describe("getLeaderboard", () => {
    test("returns agents sorted by score descending", async () => {
      await store.upsert("low", 5, "init");
      await store.upsert("mid", 15, "init");
      await store.upsert("high", 25, "init");

      const result = await store.getLeaderboard({});
      expect(result.data).toHaveLength(3);
      expect(result.data[0]!.agent_id).toBe("high");
      expect(result.data[1]!.agent_id).toBe("mid");
      expect(result.data[2]!.agent_id).toBe("low");
    });

    test("supports pagination (limit/offset, total count)", async () => {
      await store.upsert("a", 30, "init");
      await store.upsert("b", 20, "init");
      await store.upsert("c", 10, "init");

      const page = await store.getLeaderboard({ offset: 1, limit: 1 });
      expect(page.data).toHaveLength(1);
      expect(page.data[0]!.agent_id).toBe("b");
      expect(page.total).toBe(3);
      expect(page.offset).toBe(1);
      expect(page.limit).toBe(1);
    });

    test("defaults to offset=0 limit=20", async () => {
      await store.upsert("x", 1, "init");
      const result = await store.getLeaderboard({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
    });
  });

  // ── Validation votes ────────────────────────────────────

  describe("recordVote / getVotes", () => {
    test("recordVote stores validation votes", async () => {
      const vote: ValidationVote = {
        validatorId: "validator-1",
        targetId: "target-1",
        unitId: "unit-1",
        valid: true,
        timestamp: new Date().toISOString(),
      };

      await store.recordVote(vote);
      const votes = await store.getVotes();
      expect(votes).toHaveLength(1);
      expect(votes[0]).toEqual(vote);
    });

    test("getVotes returns a copy (mutations do not affect store)", async () => {
      const vote: ValidationVote = {
        validatorId: "v",
        targetId: "t",
        unitId: "u",
        valid: false,
        timestamp: new Date().toISOString(),
      };
      await store.recordVote(vote);

      const votes = await store.getVotes();
      votes.pop();

      const again = await store.getVotes();
      expect(again).toHaveLength(1);
    });
  });

  // ── Vote cooldown ───────────────────────────────────────

  describe("canVote", () => {
    test("returns false for unknown agent", async () => {
      expect(await store.canVote("ghost")).toBe(false);
    });

    test("returns false for agents younger than 30 days", async () => {
      await store.upsert("new-agent", 10, "join");
      // created_at is just now, so < 30 days
      expect(await store.canVote("new-agent")).toBe(false);
    });

    test("returns true for agents older than 30 days", async () => {
      await store.upsert("old-agent", 10, "join");
      // Backdate created_at to 31 days ago
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      store._setCreatedAt("old-agent", thirtyOneDaysAgo);

      expect(await store.canVote("old-agent")).toBe(true);
    });

    test("returns false for agent exactly at 30-day boundary minus 1ms", async () => {
      await store.upsert("edge-agent", 5, "join");
      // 30 days minus 1 millisecond — still too young
      const almostThirtyDays = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000 - 1));
      store._setCreatedAt("edge-agent", almostThirtyDays);

      expect(await store.canVote("edge-agent")).toBe(false);
    });
  });
});
