import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { importProxyRoutes } from "./import-proxy.js";

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("POST /v1/import/notion", () => {
  const app = new Hono();
  app.route("/v1/import", importProxyRoutes());

  test("returns 400 when pageId missing", async () => {
    const res = await app.request("/v1/import/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "ntn_xxx" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 when token missing", async () => {
    const res = await app.request("/v1/import/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: "abc123" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/import/confluence", () => {
  const app = new Hono();
  app.route("/v1/import", importProxyRoutes());

  test("returns 400 when required fields missing", async () => {
    const res = await app.request("/v1/import/confluence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: "123" }),
    });
    expect(res.status).toBe(400);
  });

  test("proxies to Confluence API and returns parsed result", async () => {
    const adf = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Step 1" }], attrs: { level: 1 } },
        { type: "paragraph", content: [{ type: "text", text: "Do the thing" }] },
      ],
    };
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          title: "Test SOP",
          body: { atlas_doc_format: { value: JSON.stringify(adf) } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const res = await app.request("/v1/import/confluence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: "123",
        baseUrl: "https://test.atlassian.net",
        token: "user@test.com:api_token",
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { text: string; sections: unknown[] };
    expect(data.sections).toHaveLength(1);
    expect(data.text).toContain("Step 1");
  });
});
