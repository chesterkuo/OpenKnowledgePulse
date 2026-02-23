import { KnowledgeUnitSchema } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import type { AllStores, StoredKnowledgeUnit } from "../store/interfaces.js";
import type { HonoEnv } from "../types.js";

export function knowledgeRoutes(stores: AllStores) {
  const app = new Hono<HonoEnv>();

  // GET /v1/knowledge — Search knowledge units
  app.get("/", async (c) => {
    const query = c.req.query("q");
    const types = c.req.query("types")?.split(",").filter(Boolean);
    const domain = c.req.query("domain");
    const minQuality = c.req.query("min_quality") ? Number(c.req.query("min_quality")) : undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const result = await stores.knowledge.search({
      query,
      types,
      domain,
      min_quality: minQuality,
      pagination: { offset, limit },
    });

    return c.json(result);
  });

  // GET /v1/knowledge/:id — Get knowledge unit by ID
  app.get("/:id", async (c) => {
    const entry = await stores.knowledge.getById(c.req.param("id"));
    if (!entry) {
      return c.json({ error: "Knowledge unit not found" }, 404);
    }
    return c.json({ data: entry });
  });

  // POST /v1/knowledge — Contribute a knowledge unit
  app.post("/", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required for write operations" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("write") && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Write scope required" }, 403);
    }

    // Check minimum reputation
    if (auth.agentId) {
      const rep = await stores.reputation.get(auth.agentId);
      if (!rep || rep.score < 0.1) {
        return c.json(
          { error: "Minimum KP-REP score of 0.1 required to contribute knowledge" },
          403,
        );
      }
    }

    const body = await c.req.json();

    // Zod validation as first line of defense
    const parsed = KnowledgeUnitSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid KnowledgeUnit",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }

    const unit = parsed.data;
    const now = new Date().toISOString();

    const entry: StoredKnowledgeUnit = {
      id: unit.id,
      unit,
      visibility: unit.metadata.visibility,
      created_at: now,
      updated_at: now,
    };

    const created = await stores.knowledge.create(entry);

    // Award reputation
    if (auth.agentId) {
      await stores.reputation.upsert(auth.agentId, 0.2, `Contributed ${unit["@type"]}`);
    }

    return c.json({ data: created, quality_score: unit.metadata.quality_score }, 201);
  });

  // POST /v1/knowledge/:id/validate — Submit validation result
  app.post("/:id/validate", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const entry = await stores.knowledge.getById(c.req.param("id"));
    if (!entry) {
      return c.json({ error: "Knowledge unit not found" }, 404);
    }

    const { valid: _valid, feedback } = await c.req.json();

    // Add validator to the unit
    if (!entry.unit.metadata.validated_by) {
      entry.unit.metadata.validated_by = [];
    }
    if (auth.agentId) {
      entry.unit.metadata.validated_by.push(`kp:validator:${auth.agentId}`);
    }

    // Award reputation for validation
    if (auth.agentId) {
      await stores.reputation.upsert(auth.agentId, 0.05, "Validated knowledge unit");
    }

    return c.json({ data: { id: entry.id, validated: true, feedback } });
  });

  // DELETE /v1/knowledge/:id — Delete a knowledge unit (GDPR Art. 17)
  app.delete("/:id", async (c) => {
    const auth = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const entry = await stores.knowledge.getById(c.req.param("id"));
    if (!entry) {
      return c.json({ error: "Knowledge unit not found" }, 404);
    }

    // Only the contributor or admin can delete
    if (entry.unit.metadata.agent_id !== auth.agentId && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Forbidden: can only delete your own contributions" }, 403);
    }

    await stores.knowledge.delete(c.req.param("id"));
    return c.json({
      deleted: true,
      unit_id: c.req.param("id"),
      deleted_at: new Date().toISOString(),
      deleted_by: auth.agentId,
    });
  });

  return app;
}
