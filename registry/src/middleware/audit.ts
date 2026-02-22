import type { Context, Next } from "hono";
import type { AuditAction, AuditLogStore } from "../store/interfaces.js";
import type { AuthContext } from "./auth.js";

function inferAction(method: string): AuditAction {
  switch (method) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}

function inferResourceType(path: string): string {
  if (path.includes("/skills")) return "skill";
  if (path.includes("/knowledge")) return "knowledge";
  if (path.includes("/reputation")) return "reputation";
  if (path.includes("/export")) return "export";
  return "unknown";
}

export function auditMiddleware(auditLogStore: AuditLogStore) {
  return async (c: Context, next: Next) => {
    await next();
    const auth: AuthContext = c.get("auth") ?? {
      authenticated: false,
      tier: "anonymous",
    };
    auditLogStore
      .log({
        action: inferAction(c.req.method),
        agentId: auth.agentId ?? "anonymous",
        resourceType: inferResourceType(c.req.path),
        resourceId: c.req.path,
        ip: c.req.header("x-forwarded-for") ?? "unknown",
      })
      .catch(() => {});
  };
}
