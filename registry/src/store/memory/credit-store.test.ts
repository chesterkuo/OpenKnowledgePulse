import { beforeEach, describe, expect, test } from "bun:test";
import { MemoryCreditStore } from "./credit-store.js";

describe("MemoryCreditStore", () => {
  let store: MemoryCreditStore;

  beforeEach(() => {
    store = new MemoryCreditStore();
  });

  describe("getBalance", () => {
    test("should return 0 for a new agent", async () => {
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(0);
    });
  });

  describe("addCredits", () => {
    test("should increase balance", async () => {
      await store.addCredits("agent-1", 100, "initial grant");
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(100);
    });

    test("should accumulate credits across multiple additions", async () => {
      await store.addCredits("agent-1", 50, "first grant");
      await store.addCredits("agent-1", 30, "second grant");
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(80);
    });
  });

  describe("deductCredits", () => {
    test("should decrease balance and return true when sufficient funds", async () => {
      await store.addCredits("agent-1", 100, "grant");
      const result = await store.deductCredits("agent-1", 40, "purchase");
      expect(result).toBe(true);
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(60);
    });

    test("should return false when insufficient balance", async () => {
      await store.addCredits("agent-1", 30, "grant");
      const result = await store.deductCredits("agent-1", 50, "purchase");
      expect(result).toBe(false);
    });

    test("should not change balance when insufficient funds", async () => {
      await store.addCredits("agent-1", 30, "grant");
      await store.deductCredits("agent-1", 50, "purchase");
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(30);
    });

    test("should return false when deducting from zero balance", async () => {
      const result = await store.deductCredits("agent-1", 10, "purchase");
      expect(result).toBe(false);
      const balance = await store.getBalance("agent-1");
      expect(balance).toBe(0);
    });
  });

  describe("getTransactions", () => {
    test("should return empty results for a new agent", async () => {
      const result = await store.getTransactions("agent-1", {});
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    test("should record addCredits transactions with type 'earned'", async () => {
      await store.addCredits("agent-1", 100, "contribution reward");
      const result = await store.getTransactions("agent-1", {});
      expect(result.total).toBe(1);
      expect(result.data[0]?.type).toBe("earned");
      expect(result.data[0]?.amount).toBe(100);
      expect(result.data[0]?.description).toBe("contribution reward");
      expect(result.data[0]?.agent_id).toBe("agent-1");
    });

    test("should record deductCredits transactions with type 'spent'", async () => {
      await store.addCredits("agent-1", 100, "grant");
      await store.deductCredits("agent-1", 40, "bought skill");
      const result = await store.getTransactions("agent-1", {});
      expect(result.total).toBe(2);
      expect(result.data[1]?.type).toBe("spent");
      expect(result.data[1]?.amount).toBe(-40);
      expect(result.data[1]?.description).toBe("bought skill");
    });

    test("should not record a transaction on failed deduction", async () => {
      await store.addCredits("agent-1", 10, "grant");
      await store.deductCredits("agent-1", 50, "too expensive");
      const result = await store.getTransactions("agent-1", {});
      // Only the addCredits transaction should be recorded
      expect(result.total).toBe(1);
      expect(result.data[0]?.type).toBe("earned");
    });

    test("should paginate transactions", async () => {
      await store.addCredits("agent-1", 10, "tx-1");
      await store.addCredits("agent-1", 20, "tx-2");
      await store.addCredits("agent-1", 30, "tx-3");
      await store.addCredits("agent-1", 40, "tx-4");

      const page1 = await store.getTransactions("agent-1", {
        offset: 0,
        limit: 2,
      });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.offset).toBe(0);
      expect(page1.limit).toBe(2);
      expect(page1.data[0]?.description).toBe("tx-1");
      expect(page1.data[1]?.description).toBe("tx-2");

      const page2 = await store.getTransactions("agent-1", {
        offset: 2,
        limit: 2,
      });
      expect(page2.data).toHaveLength(2);
      expect(page2.total).toBe(4);
      expect(page2.data[0]?.description).toBe("tx-3");
      expect(page2.data[1]?.description).toBe("tx-4");
    });

    test("should default pagination to offset=0, limit=20", async () => {
      await store.addCredits("agent-1", 10, "tx-1");
      const result = await store.getTransactions("agent-1", {});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
    });
  });

  describe("getLastRefill / setLastRefill", () => {
    test("should return undefined for a new agent", async () => {
      const result = await store.getLastRefill("agent-1");
      expect(result).toBeUndefined();
    });

    test("should return the set date after setLastRefill", async () => {
      const date = "2026-02-22T00:00:00.000Z";
      await store.setLastRefill("agent-1", date);
      const result = await store.getLastRefill("agent-1");
      expect(result).toBe(date);
    });

    test("should overwrite previous refill date", async () => {
      await store.setLastRefill("agent-1", "2026-02-01T00:00:00.000Z");
      await store.setLastRefill("agent-1", "2026-02-22T00:00:00.000Z");
      const result = await store.getLastRefill("agent-1");
      expect(result).toBe("2026-02-22T00:00:00.000Z");
    });
  });

  describe("multiple agents", () => {
    test("should maintain independent balances", async () => {
      await store.addCredits("agent-1", 100, "grant");
      await store.addCredits("agent-2", 200, "grant");

      expect(await store.getBalance("agent-1")).toBe(100);
      expect(await store.getBalance("agent-2")).toBe(200);
    });

    test("should maintain independent transactions", async () => {
      await store.addCredits("agent-1", 50, "a1-tx");
      await store.addCredits("agent-2", 75, "a2-tx");

      const tx1 = await store.getTransactions("agent-1", {});
      const tx2 = await store.getTransactions("agent-2", {});

      expect(tx1.total).toBe(1);
      expect(tx1.data[0]?.description).toBe("a1-tx");
      expect(tx2.total).toBe(1);
      expect(tx2.data[0]?.description).toBe("a2-tx");
    });

    test("should maintain independent last refill dates", async () => {
      await store.setLastRefill("agent-1", "2026-01-01T00:00:00.000Z");
      await store.setLastRefill("agent-2", "2026-02-01T00:00:00.000Z");

      expect(await store.getLastRefill("agent-1")).toBe("2026-01-01T00:00:00.000Z");
      expect(await store.getLastRefill("agent-2")).toBe("2026-02-01T00:00:00.000Z");
    });

    test("deducting from one agent should not affect another", async () => {
      await store.addCredits("agent-1", 100, "grant");
      await store.addCredits("agent-2", 100, "grant");

      await store.deductCredits("agent-1", 60, "purchase");

      expect(await store.getBalance("agent-1")).toBe(40);
      expect(await store.getBalance("agent-2")).toBe(100);
    });
  });
});
