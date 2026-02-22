import type { Context, Next } from "hono";
import type Redis from "ioredis";

export function idempotencyMiddleware(redis: Redis) {
  return async (c: Context, next: Next) => {
    // Only apply to write methods
    if (c.req.method !== "POST" && c.req.method !== "PUT") {
      await next();
      return;
    }

    const key = c.req.header("Idempotency-Key");
    if (!key) {
      await next();
      return;
    }

    const redisKey = `idempotency:${key}`;
    const cached = await redis.get(redisKey);
    if (cached) {
      const { status, body } = JSON.parse(cached);
      c.header("Idempotency-Replayed", "true");
      return c.json(body, status);
    }

    await next();

    // Cache the response (24h TTL)
    if (c.res.status < 500) {
      const cloned = c.res.clone();
      const body = await cloned.json().catch(() => null);
      if (body !== null) {
        await redis.set(
          redisKey,
          JSON.stringify({ status: c.res.status, body }),
          "EX",
          86400,
        );
      }
    }
  };
}
