import { describe, expect, test } from "bun:test";
import { cleanPii } from "./pii-cleaner.js";

describe("cleanPii", () => {
  // ── OpenAI API keys ────────────────────────────────────────

  test("redacts OpenAI API keys", () => {
    const input = "My key is sk-abc123def456ghi789jkl012mno345";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("My key is [REDACTED:api_key]");
    expect(result.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  // ── GitHub tokens ──────────────────────────────────────────

  test("redacts GitHub personal access tokens (ghp_)", () => {
    const token = `ghp_${"A".repeat(36)}`;
    const input = `Token: ${token}`;
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Token: [REDACTED:api_key]");
    expect(result.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  test("redacts GitHub OAuth tokens (gho_)", () => {
    const token = `gho_${"B".repeat(36)}`;
    const input = `OAuth: ${token}`;
    const result = cleanPii(input);
    expect(result.cleaned).toBe("OAuth: [REDACTED:api_key]");
  });

  test("redacts GitHub app tokens (ghs_)", () => {
    const token = `ghs_${"C".repeat(36)}`;
    const input = `App: ${token}`;
    const result = cleanPii(input);
    expect(result.cleaned).toBe("App: [REDACTED:api_key]");
  });

  // ── AWS access keys ───────────────────────────────────────

  test("redacts AWS access keys", () => {
    const input = "AWS key: AKIAIOSFODNN7EXAMPLE";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("AWS key: [REDACTED:api_key]");
    expect(result.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  // ── KP API keys ───────────────────────────────────────────

  test("redacts KP API keys", () => {
    const input = "API key: kp_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("API key: [REDACTED:api_key]");
    expect(result.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  // ── Slack tokens ──────────────────────────────────────────

  test("redacts Slack bot tokens (xoxb-)", () => {
    const input = "Slack: xoxb-fake-token-for-testing";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Slack: [REDACTED:api_key]");
    expect(result.redactions).toContainEqual({ type: "api_key", count: 1 });
  });

  test("redacts Slack user tokens (xoxp-)", () => {
    const input = "Token: xoxp-123-456-789-abcdef";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Token: [REDACTED:api_key]");
  });

  // ── Generic password patterns ─────────────────────────────

  test("redacts password=value patterns", () => {
    const input = "password=mysecretpass123";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("password=[REDACTED:password]");
    expect(result.redactions).toContainEqual({ type: "password", count: 1 });
  });

  test("redacts secret=value patterns", () => {
    const input = "secret=topsecretvalue";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("secret=[REDACTED:password]");
  });

  test("redacts token=value patterns", () => {
    const input = "token=abc123def456";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("token=[REDACTED:password]");
  });

  test("redacts api_key=value patterns", () => {
    const input = "api_key=myapikey123";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("api_key=[REDACTED:password]");
  });

  test("redacts password patterns with colon separator", () => {
    const input = 'password: "hunter2"';
    const result = cleanPii(input);
    expect(result.cleaned).toContain("[REDACTED:password]");
  });

  // ── Connection strings ────────────────────────────────────

  test("redacts PostgreSQL connection strings", () => {
    const input = "DB_URL=postgresql://admin:secret@db.example.com:5432/mydb";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("DB_URL=[REDACTED:connection_string]");
    expect(result.redactions).toContainEqual({ type: "connection_string", count: 1 });
  });

  test("redacts Redis connection strings", () => {
    const input = "REDIS_URL=redis://:mypassword@redis.example.com:6379/0";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("REDIS_URL=[REDACTED:connection_string]");
  });

  test("redacts MongoDB+SRV connection strings", () => {
    const input = "MONGO=mongodb+srv://user:pass@cluster.mongodb.net/db";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("MONGO=[REDACTED:connection_string]");
  });

  test("connection strings are redacted before generic password patterns", () => {
    // If password= ran first, it would match "password" inside the connection string
    // but the connection string pattern should consume the entire URL first
    const input = "postgresql://user:password=test@host:5432/db";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("[REDACTED:connection_string]");
    // Should NOT have a separate password redaction from the URL innards
  });

  // ── Bearer tokens ─────────────────────────────────────────

  test("redacts Bearer tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const input = `Authorization: Bearer ${jwt}`;
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Authorization: Bearer [REDACTED:bearer_token]");
    expect(result.redactions).toContainEqual({ type: "bearer_token", count: 1 });
  });

  test("does NOT redact Bearer kp_ tokens (handled elsewhere)", () => {
    const input = "Authorization: Bearer kp_a1b2c3d4e5f6a7b8";
    const result = cleanPii(input);
    // The Bearer pattern should skip kp_ prefixed tokens
    // But the KP key pattern should still redact it
    expect(result.cleaned).toContain("Bearer");
    expect(result.cleaned).not.toContain("bearer_token");
    // The kp_ key itself gets redacted by the KP key pattern
    expect(result.cleaned).toBe("Authorization: Bearer [REDACTED:api_key]");
  });

  // ── Email addresses ───────────────────────────────────────

  test("redacts email addresses", () => {
    const input = "Contact: alice@example.com for details";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Contact: [REDACTED:email] for details");
    expect(result.redactions).toContainEqual({ type: "email", count: 1 });
  });

  test("redacts multiple email addresses", () => {
    const input = "From: a@b.com to c@d.org";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("From: [REDACTED:email] to [REDACTED:email]");
    expect(result.redactions).toContainEqual({ type: "email", count: 2 });
  });

  // ── Phone numbers ─────────────────────────────────────────

  test("redacts US phone numbers", () => {
    const input = "Call me at (555) 123-4567";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Call me at [REDACTED:phone]");
    expect(result.redactions).toContainEqual({ type: "phone", count: 1 });
  });

  test("redacts phone numbers with dashes", () => {
    const input = "Phone: 555-234-5678";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Phone: [REDACTED:phone]");
  });

  test("redacts international phone numbers with + prefix", () => {
    const input = "WhatsApp: +441234567890";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("WhatsApp: [REDACTED:phone]");
  });

  // ── IPv4 addresses ────────────────────────────────────────

  test("redacts IPv4 addresses", () => {
    const input = "Server at 192.168.1.100 is down";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Server at [REDACTED:ip] is down");
    expect(result.redactions).toContainEqual({ type: "ip", count: 1 });
  });

  test("redacts multiple IPv4 addresses", () => {
    const input = "From 10.0.0.1 to 10.0.0.2";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("From [REDACTED:ip] to [REDACTED:ip]");
    expect(result.redactions).toContainEqual({ type: "ip", count: 2 });
  });

  // ── File paths ────────────────────────────────────────────

  test("redacts /home/<user>/ paths", () => {
    const input = "Found at /home/alice/documents/secret.txt";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Found at [REDACTED:filepath]");
    expect(result.redactions).toContainEqual({ type: "filepath", count: 1 });
  });

  test("redacts /Users/<user>/ macOS paths", () => {
    const input = "Config at /Users/bob/.config/app.json";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Config at [REDACTED:filepath]");
  });

  test("redacts C:\\Users\\<user>\\ Windows paths", () => {
    const input = "File: C:\\Users\\charlie\\Desktop\\report.xlsx";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("File: [REDACTED:filepath]");
  });

  // ── Privacy level: "private" ──────────────────────────────

  test('"private" level only redacts secrets, keeps emails', () => {
    const input = "User alice@example.com has key sk-abc123def456ghi789jkl012mno345";
    const result = cleanPii(input, "private");
    expect(result.cleaned).toContain("alice@example.com");
    expect(result.cleaned).toContain("[REDACTED:api_key]");
    expect(result.cleaned).not.toContain("sk-");
  });

  test('"private" level keeps IPv4 addresses', () => {
    const input = "Server 192.168.1.1 with password=secret123";
    const result = cleanPii(input, "private");
    expect(result.cleaned).toContain("192.168.1.1");
    expect(result.cleaned).toContain("[REDACTED:password]");
  });

  test('"private" level keeps phone numbers', () => {
    const input = "Call (555) 123-4567, token=mysecret";
    const result = cleanPii(input, "private");
    expect(result.cleaned).toContain("(555) 123-4567");
    expect(result.cleaned).toContain("[REDACTED:password]");
  });

  test('"private" level keeps file paths', () => {
    const input = "Path /home/alice/file.txt with secret=abc";
    const result = cleanPii(input, "private");
    expect(result.cleaned).toContain("/home/alice/file.txt");
    expect(result.cleaned).toContain("[REDACTED:password]");
  });

  // ── Privacy level: "aggregated" ───────────────────────────

  test('"aggregated" level redacts everything', () => {
    const input =
      "alice@example.com at 192.168.1.1 with key sk-abc123def456ghi789jkl012mno345 in /home/alice/app";
    const result = cleanPii(input, "aggregated");
    expect(result.cleaned).not.toContain("alice@example.com");
    expect(result.cleaned).not.toContain("192.168.1.1");
    expect(result.cleaned).not.toContain("sk-");
    expect(result.cleaned).not.toContain("/home/alice");
    expect(result.cleaned).toContain("[REDACTED:email]");
    expect(result.cleaned).toContain("[REDACTED:ip]");
    expect(result.cleaned).toContain("[REDACTED:api_key]");
    expect(result.cleaned).toContain("[REDACTED:filepath]");
  });

  // ── Privacy level: "federated" ────────────────────────────

  test('"federated" level redacts identifiers and secrets', () => {
    const input = "Email: bob@test.org, IP: 10.0.0.5, Key: AKIAIOSFODNN7EXAMPLE";
    const result = cleanPii(input, "federated");
    expect(result.cleaned).toContain("[REDACTED:email]");
    expect(result.cleaned).toContain("[REDACTED:ip]");
    expect(result.cleaned).toContain("[REDACTED:api_key]");
  });

  // ── Clean text passes through unchanged ───────────────────

  test("clean text passes through unchanged", () => {
    const input = "This is perfectly clean text with no PII whatsoever.";
    const result = cleanPii(input);
    expect(result.cleaned).toBe(input);
    expect(result.redactions).toHaveLength(0);
  });

  test("markdown content passes through unchanged", () => {
    const input = "# Title\n\n- item 1\n- item 2\n\n```code block```";
    const result = cleanPii(input);
    expect(result.cleaned).toBe(input);
    expect(result.redactions).toHaveLength(0);
  });

  // ── Multiple redactions accumulate counts ─────────────────

  test("multiple redactions accumulate counts", () => {
    const token1 = `ghp_${"A".repeat(36)}`;
    const token2 = `ghp_${"B".repeat(36)}`;
    const input = `Keys: ${token1} and ${token2} plus sk-abc123def456ghi789jkl012mno345`;
    const result = cleanPii(input);
    const apiKeyRedaction = result.redactions.find((r) => r.type === "api_key");
    expect(apiKeyRedaction).toBeDefined();
    expect(apiKeyRedaction!.count).toBeGreaterThanOrEqual(3);
  });

  // ── Empty string ──────────────────────────────────────────

  test("empty string returns empty result", () => {
    const result = cleanPii("");
    expect(result.cleaned).toBe("");
    expect(result.redactions).toHaveLength(0);
  });

  // ── Default privacy level is "aggregated" ─────────────────

  test("defaults to aggregated level when no level specified", () => {
    const input = "Email: test@test.com";
    const result = cleanPii(input);
    expect(result.cleaned).toBe("Email: [REDACTED:email]");
  });

  // ── Mixed content ─────────────────────────────────────────

  test("handles mixed secrets and identifiers in one string", () => {
    const input = [
      "Config: postgresql://admin:pass@db:5432/app",
      "Contact: admin@corp.com",
      "Server: 10.20.30.40",
      "Path: /home/deploy/app/config.yml",
    ].join("\n");
    const result = cleanPii(input);
    expect(result.cleaned).toContain("[REDACTED:connection_string]");
    expect(result.cleaned).toContain("[REDACTED:email]");
    expect(result.cleaned).toContain("[REDACTED:ip]");
    expect(result.cleaned).toContain("[REDACTED:filepath]");
    expect(result.redactions.length).toBeGreaterThanOrEqual(4);
  });
});
