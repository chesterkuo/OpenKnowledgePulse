import type { Context, Next } from "hono";

const CURRENT_VERSION = "v1";

export function schemaVersionMiddleware() {
  return async (c: Context, next: Next) => {
    const requestedVersion = c.req.header("KP-Schema-Version");

    // Store requested version for route handlers
    c.set("schemaVersion", requestedVersion ?? CURRENT_VERSION);

    await next();

    // Set response header
    c.header("KP-Schema-Version", CURRENT_VERSION);

    // If deprecated version requested, add deprecation header
    if (requestedVersion && requestedVersion !== CURRENT_VERSION) {
      c.header("KP-Deprecated", "true");
    }
  };
}
