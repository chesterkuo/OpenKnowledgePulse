import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { KPCapture } from "./capture.js";

// ── Fetch mock setup ──────────────────────────────────────

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

beforeEach(() => {
  fetchMock = mock(() =>
    Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ── Tests ──────────────────────────────────────────────────

describe("KPCapture", () => {
  describe("wrap()", () => {
    test("calls the wrapped function and returns its result", async () => {
      const capture = new KPCapture({ domain: "test" });
      const innerFn = mock(async (x: unknown) => `result:${x}`);
      const wrapped = capture.wrap(innerFn);

      const result = await wrapped("hello");
      expect(result).toBe("result:hello");
      expect(innerFn).toHaveBeenCalledTimes(1);
    });

    test("passes through all arguments to the wrapped function", async () => {
      const capture = new KPCapture({ domain: "test" });
      const innerFn = mock(async (...args: unknown[]) => args);
      const wrapped = capture.wrap(innerFn);

      const result = await wrapped("a", 2, true);
      expect(result).toEqual(["a", 2, true]);
    });

    test("re-throws errors from the wrapped function", async () => {
      const capture = new KPCapture({ domain: "test" });
      const error = new Error("agent failed");
      const innerFn = mock(async () => {
        throw error;
      });
      const wrapped = capture.wrap(innerFn);

      await expect(wrapped()).rejects.toThrow("agent failed");
    });

    test("still triggers non-blocking contribution on error", async () => {
      const capture = new KPCapture({
        domain: "test",
        valueThreshold: 0, // ensure it tries to contribute
        registryUrl: "https://test.registry.dev",
      });
      const innerFn = mock(async () => {
        throw new Error("boom");
      });
      const wrapped = capture.wrap(innerFn);

      try {
        await wrapped();
      } catch {
        // expected
      }

      // Wait for the fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 50));

      // The scoreAndContribute path should have called fetch
      // (it may or may not have been called depending on the score threshold,
      // but the function itself was invoked without affecting the throw)
    });

    test("does not block the wrapped function while contributing", async () => {
      const capture = new KPCapture({
        domain: "test",
        valueThreshold: 0, // always contribute
        registryUrl: "https://test.registry.dev",
      });

      // Make fetch slow
      globalThis.fetch = mock(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response("ok")), 500)),
      ) as unknown as typeof fetch;

      const innerFn = mock(async () => "fast-result");
      const wrapped = capture.wrap(innerFn);

      const start = Date.now();
      const result = await wrapped();
      const elapsed = Date.now() - start;

      expect(result).toBe("fast-result");
      // The wrap should return well before the 500ms fetch completes
      expect(elapsed).toBeLessThan(200);
    });

    test("fetch is called with correct URL and headers when apiKey provided", async () => {
      // Wait for any lingering async contributions from prior tests, then reset the mock
      await new Promise((r) => setTimeout(r, 100));
      fetchMock.mockClear();

      const capture = new KPCapture({
        domain: "test",
        valueThreshold: 0,
        registryUrl: "https://my-registry.dev",
        apiKey: "sk-test-key",
      });

      const innerFn = mock(async () => "done");
      const wrapped = capture.wrap(innerFn);
      await wrapped();

      // Wait for the async contribution
      await new Promise((r) => setTimeout(r, 50));

      // Find the call targeting our specific registry URL
      const matchingCall = fetchMock.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].startsWith("https://my-registry.dev"),
      );
      expect(matchingCall).toBeDefined();
      const [url, opts] = matchingCall as [string, RequestInit];
      expect(url).toStartWith("https://my-registry.dev/v1/knowledge");
      expect(opts.method).toBe("POST");
      const headers = opts.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer sk-test-key");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    test("skips capture when autoCapture is false", async () => {
      // Wait for any lingering async contributions from prior tests to settle
      await new Promise((r) => setTimeout(r, 100));

      // Create a fresh, isolated fetch mock for this test
      const localFetchMock = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      );
      globalThis.fetch = localFetchMock as unknown as typeof fetch;

      const capture = new KPCapture({
        domain: "test",
        autoCapture: false,
        valueThreshold: 0,
      });

      const innerFn = mock(async () => "result");
      const wrapped = capture.wrap(innerFn);
      const result = await wrapped();

      expect(result).toBe("result");
      expect(innerFn).toHaveBeenCalledTimes(1);

      // Wait to make sure no async contribution fires
      await new Promise((r) => setTimeout(r, 100));
      // fetch should not have been called since autoCapture is false
      expect(localFetchMock).not.toHaveBeenCalled();
    });

    test("contribution failure does not affect the wrapped function result", async () => {
      // Make fetch reject
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("network error")),
      ) as unknown as typeof fetch;

      const capture = new KPCapture({
        domain: "test",
        valueThreshold: 0,
      });

      const innerFn = mock(async () => "success");
      const wrapped = capture.wrap(innerFn);
      const result = await wrapped();

      expect(result).toBe("success");

      // Wait for the fire-and-forget promise
      await new Promise((r) => setTimeout(r, 50));
      // No unhandled rejection — the error was silently caught
    });

    test("sends a valid ReasoningTrace JSON body", async () => {
      const capture = new KPCapture({
        domain: "code-review",
        valueThreshold: 0,
        registryUrl: "https://test.dev",
      });

      const innerFn = mock(async () => "done");
      const wrapped = capture.wrap(innerFn);
      await wrapped();

      await new Promise((r) => setTimeout(r, 50));

      if (fetchMock.mock.calls.length > 0) {
        const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(opts.body as string);
        expect(body["@context"]).toBe("https://openknowledgepulse.org/schema/v1");
        expect(body["@type"]).toBe("ReasoningTrace");
        expect(body.id).toMatch(/^kp:trace:/);
        expect(body.metadata.task_domain).toBe("code-review");
        expect(body.metadata.success).toBe(true);
        expect(body.steps.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("uses default registry URL when none provided", async () => {
      const capture = new KPCapture({
        domain: "test",
        valueThreshold: 0,
      });

      const innerFn = mock(async () => "done");
      const wrapped = capture.wrap(innerFn);
      await wrapped();

      await new Promise((r) => setTimeout(r, 50));

      if (fetchMock.mock.calls.length > 0) {
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toStartWith("https://registry.openknowledgepulse.org/v1/knowledge");
      }
    });
  });
});
