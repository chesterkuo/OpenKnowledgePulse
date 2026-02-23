import type Redis from "ioredis";

/**
 * MCP session manager interface.
 * Maps session tokens to API keys with TTL-based expiration.
 */
export interface McpSessionManager {
  /** Create a new session, associating it with an API key. Returns session token. */
  createSession(apiKey: string): Promise<string>;

  /** Look up the API key for a session token. Returns null if expired/not found. */
  resolveSession(sessionToken: string): Promise<string | null>;

  /** Explicitly destroy a session */
  destroySession(sessionToken: string): Promise<void>;
}

/**
 * Redis-backed session manager.
 * Stores session-to-API-key mappings as `{prefix}{token}` with configurable TTL.
 */
export class RedisSessionManager implements McpSessionManager {
  private readonly prefix: string;
  private readonly ttlSeconds: number;

  constructor(
    private redis: Redis,
    opts?: { prefix?: string; ttlSeconds?: number },
  ) {
    this.prefix = opts?.prefix ?? "mcp-session:";
    this.ttlSeconds = opts?.ttlSeconds ?? 3600; // 1 hour default
  }

  async createSession(apiKey: string): Promise<string> {
    const token = crypto.randomUUID();
    await this.redis.set(`${this.prefix}${token}`, apiKey, "EX", this.ttlSeconds);
    return token;
  }

  async resolveSession(sessionToken: string): Promise<string | null> {
    return await this.redis.get(`${this.prefix}${sessionToken}`);
  }

  async destroySession(sessionToken: string): Promise<void> {
    await this.redis.del(`${this.prefix}${sessionToken}`);
  }

  /** Expose TTL for endpoint responses */
  get sessionTtlSeconds(): number {
    return this.ttlSeconds;
  }
}

/**
 * In-memory session manager fallback when Redis is not available.
 * Uses a Map with manual expiration checks.
 */
export class MemorySessionManager implements McpSessionManager {
  private sessions = new Map<string, { apiKey: string; expiresAt: number }>();
  private readonly ttlMs: number;
  readonly sessionTtlSeconds: number;

  constructor(ttlSeconds = 3600) {
    this.ttlMs = ttlSeconds * 1000;
    this.sessionTtlSeconds = ttlSeconds;
  }

  async createSession(apiKey: string): Promise<string> {
    const token = crypto.randomUUID();
    this.sessions.set(token, { apiKey, expiresAt: Date.now() + this.ttlMs });
    return token;
  }

  async resolveSession(sessionToken: string): Promise<string | null> {
    const entry = this.sessions.get(sessionToken);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(sessionToken);
      return null;
    }
    return entry.apiKey;
  }

  async destroySession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken);
  }
}
