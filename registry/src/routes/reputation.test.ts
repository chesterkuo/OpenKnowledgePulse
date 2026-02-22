import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createMemoryStore } from "../store/memory/index.js";
import { reputationRoutes } from "./reputation.js";
import type { AllStores } from "../store/interfaces.js";

describe("reputation routes", () => {
  let app: Hono;
  let stores: AllStores;

  beforeEach(() => {
    stores = createMemoryStore();
    app = new Hono();
    app.route("/v1/reputation", reputationRoutes(stores));
  });

  test("GET /v1/reputation/leaderboard returns sorted agents", async () => {
    await stores.reputation.upsert("alice", 0.8, "test");
    await stores.reputation.upsert("bob", 0.5, "test");
    await stores.reputation.upsert("charlie", 0.9, "test");
    const res = await app.request("/v1/reputation/leaderboard?limit=10");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(3);
    expect(body.data[0].agent_id).toBe("charlie");
  });

  test("GET /v1/reputation/leaderboard supports pagination", async () => {
    await stores.reputation.upsert("a", 0.9, "test");
    await stores.reputation.upsert("b", 0.8, "test");
    await stores.reputation.upsert("c", 0.7, "test");
    const res = await app.request("/v1/reputation/leaderboard?limit=2&offset=0");
    const body = await res.json() as any;
    expect(body.data.length).toBe(2);
    expect(body.total).toBe(3);
  });

  test("GET /v1/reputation/:agent_id returns existing record", async () => {
    await stores.reputation.upsert("alice", 0.8, "test");
    const res = await app.request("/v1/reputation/alice");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.score).toBe(0.8);
  });

  test("GET /v1/reputation/:agent_id returns zero for unknown agent", async () => {
    const res = await app.request("/v1/reputation/unknown");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.score).toBe(0);
  });
});
