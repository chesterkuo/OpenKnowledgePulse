import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores } from "../store/interfaces.js";

const QUARANTINE_THRESHOLD = Number(process.env.KP_QUARANTINE_THRESHOLD ?? 3);

export function quarantineRoutes(stores: AllStores) {
  const app = new Hono();

  // POST /v1/knowledge/:id/report — Submit security report
  app.post("/:id/report", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) return c.json({ error: "Authentication required" }, 401);

    const unitId = c.req.param("id");
    const unit = await stores.knowledge.getById(unitId);
    if (!unit) return c.json({ error: "Knowledge unit not found" }, 404);

    const body = await c.req.json().catch(() => ({}));
    const reason = (body as { reason?: string }).reason ?? "";

    const report = await stores.securityReports.report(unitId, auth.agentId!, reason);
    const count = await stores.securityReports.getReportCount(unitId);

    // Update quarantine status based on threshold
    if (count >= QUARANTINE_THRESHOLD) {
      await stores.knowledge.setQuarantineStatus?.(unitId, "quarantined");
    } else {
      await stores.knowledge.setQuarantineStatus?.(unitId, "flagged");
    }

    return c.json({
      data: report,
      report_count: count,
      threshold: QUARANTINE_THRESHOLD,
      quarantine_status: count >= QUARANTINE_THRESHOLD ? "quarantined" : "flagged",
    });
  });

  return app;
}

export function adminQuarantineRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/admin/quarantine — List flagged/quarantined units
  app.get("/", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const reported = await stores.securityReports.getAllReported();
    return c.json({ data: reported, total: reported.length });
  });

  // POST /v1/admin/quarantine/:id/resolve — Admin verdict
  app.post("/:id/resolve", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated || !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const unitId = c.req.param("id");
    const body = await c.req.json();
    const verdict = (body as { verdict: string }).verdict;

    if (verdict !== "keep" && verdict !== "remove") {
      return c.json({ error: "verdict must be 'keep' or 'remove'" }, 400);
    }

    if (verdict === "remove") {
      await stores.knowledge.delete(unitId);
    } else {
      await stores.knowledge.setQuarantineStatus?.(unitId, "cleared");
    }

    await stores.securityReports.resolve(unitId, verdict === "keep" ? "cleared" : "removed");

    return c.json({ unit_id: unitId, verdict, resolved: true });
  });

  return app;
}
