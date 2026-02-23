import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import type { AuthContext } from "./auth.js";
import { jwtAuthMiddleware } from "./jwt-auth.js";

const TEST_ISSUER = "https://test-issuer.example.com";
const TEST_AUDIENCE = "knowledgepulse-test";

describe("jwtAuthMiddleware", () => {
  let app: Hono;
  let privateKey: CryptoKey;
  let jwksServerUrl: string;
  let jwksServer: ReturnType<typeof Bun.serve>;

  beforeAll(async () => {
    // Generate an RSA key pair for signing JWTs
    const keyPair = await generateKeyPair("RS256");
    privateKey = keyPair.privateKey;

    // Export the public key as JWK for the JWKS endpoint
    const publicJWK = await exportJWK(keyPair.publicKey);
    publicJWK.kid = "test-key-1";
    publicJWK.alg = "RS256";
    publicJWK.use = "sig";

    const jwks = { keys: [publicJWK] };

    // Start a local JWKS server
    jwksServer = Bun.serve({
      port: 0, // random available port
      fetch(_req: Request) {
        return new Response(JSON.stringify(jwks), {
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    jwksServerUrl = `http://localhost:${jwksServer.port}/.well-known/jwks.json`;

    // Create the Hono app with JWT middleware
    app = new Hono();
    app.use(
      "*",
      jwtAuthMiddleware({
        issuer: TEST_ISSUER,
        audience: TEST_AUDIENCE,
        jwksUrl: jwksServerUrl,
      }),
    );

    // Test route that returns auth context
    app.get("/test", (c) => {
      const auth = c.get("auth") as AuthContext | undefined;
      return c.json({ auth: auth ?? null });
    });

    app.post("/test", (c) => {
      const auth = c.get("auth") as AuthContext | undefined;
      return c.json({ auth: auth ?? null });
    });
  });

  // Helper to sign a JWT with test claims
  async function signJWT(
    claims: Record<string, unknown> = {},
    options: { issuer?: string; audience?: string } = {},
  ) {
    const jwt = new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setSubject((claims.sub as string) ?? "test-agent");

    if (options.issuer !== undefined) {
      jwt.setIssuer(options.issuer);
    } else {
      jwt.setIssuer(TEST_ISSUER);
    }

    if (options.audience !== undefined) {
      jwt.setAudience(options.audience);
    } else {
      jwt.setAudience(TEST_AUDIENCE);
    }

    return jwt.sign(privateKey);
  }

  it("should pass through requests with no Authorization header", async () => {
    const res = await app.request("/test", { method: "GET" });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Auth should NOT be set by JWT middleware (no header)
    expect(body.auth).toBeNull();
  });

  it("should pass through requests with Bearer kp_ prefix (API key tokens)", async () => {
    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: "Bearer kp_test_api_key_12345" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Auth should NOT be set by JWT middleware (kp_ prefix)
    expect(body.auth).toBeNull();
  });

  it("should pass through requests with non-Bearer auth schemes", async () => {
    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth).toBeNull();
  });

  it("should authenticate a valid JWT and set auth context", async () => {
    const token = await signJWT({
      sub: "agent-123",
      kp_tier: "enterprise",
      scopes: ["read", "write", "admin"],
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth).not.toBeNull();
    expect(body.auth.authenticated).toBe(true);
    expect(body.auth.agentId).toBe("agent-123");
    expect(body.auth.tier).toBe("enterprise");
    expect(body.auth.apiKey.key_prefix).toBe("jwt");
    expect(body.auth.apiKey.agent_id).toBe("agent-123");
    expect(body.auth.apiKey.scopes).toEqual(["read", "write", "admin"]);
    expect(body.auth.apiKey.tier).toBe("enterprise");
    expect(body.auth.apiKey.revoked).toBe(false);
  });

  it("should use agent_id claim over sub for agentId", async () => {
    const token = await signJWT({
      sub: "sub-value",
      agent_id: "custom-agent-id",
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.agentId).toBe("custom-agent-id");
    expect(body.auth.apiKey.agent_id).toBe("custom-agent-id");
  });

  it("should default to 'pro' tier when kp_tier claim is missing", async () => {
    const token = await signJWT({ sub: "agent-default-tier" });

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.tier).toBe("pro");
    expect(body.auth.apiKey.tier).toBe("pro");
  });

  it("should default to ['read', 'write'] scopes when scopes claim is missing", async () => {
    const token = await signJWT({ sub: "agent-default-scopes" });

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.apiKey.scopes).toEqual(["read", "write"]);
  });

  it("should return 401 for an invalid JWT (garbage token)", async () => {
    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: "Bearer not.a.valid.jwt.token" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid JWT token");
    expect(body.details).toBeDefined();
  });

  it("should return 401 for a JWT with wrong issuer", async () => {
    const token = await signJWT(
      { sub: "agent-wrong-issuer" },
      { issuer: "https://wrong-issuer.example.com" },
    );

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid JWT token");
  });

  it("should return 401 for a JWT with wrong audience", async () => {
    const token = await signJWT({ sub: "agent-wrong-audience" }, { audience: "wrong-audience" });

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid JWT token");
  });

  it("should return 401 for an expired JWT", async () => {
    const token = await new SignJWT({ sub: "agent-expired" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1 hour ago
      .setIssuer(TEST_ISSUER)
      .setAudience(TEST_AUDIENCE)
      .sign(privateKey);

    const res = await app.request("/test", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid JWT token");
  });

  it("should work with POST requests", async () => {
    const token = await signJWT({
      sub: "agent-post",
      kp_tier: "free",
      scopes: ["read"],
    });

    const res = await app.request("/test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.authenticated).toBe(true);
    expect(body.auth.agentId).toBe("agent-post");
    expect(body.auth.tier).toBe("free");
  });
});
