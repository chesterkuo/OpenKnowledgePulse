import { ExpertSOPSchema, generateSkillId, generateSkillMd, generateSopId } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores, StoredSOP, StoredSkill } from "../store/interfaces.js";

export function sopRoutes(stores: AllStores) {
  const app = new Hono();

  // POST /v1/sop — Create ExpertSOP
  app.post("/", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("write") && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Write or admin scope required" }, 403);
    }

    // Check minimum reputation (KP-REP >= 0.3)
    if (auth.agentId) {
      const rep = await stores.reputation.get(auth.agentId);
      if (!rep || rep.score < 0.3) {
        return c.json(
          { error: "Minimum KP-REP score of 0.3 required to create SOPs" },
          403,
        );
      }
    }

    const body = await c.req.json();

    // Validate with ExpertSOPSchema
    const parsed = ExpertSOPSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid ExpertSOP",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }

    const sop = parsed.data;
    const now = new Date().toISOString();

    const stored: StoredSOP = {
      id: sop.id,
      sop,
      version: 1,
      status: "draft",
      visibility: sop.metadata.visibility,
      created_at: now,
      updated_at: now,
    };

    const created = await stores.sop.create(stored);

    // Add initial version entry
    await stores.sop.addVersion({
      sop_id: sop.id,
      version: 1,
      diff_summary: "Initial version",
      created_at: now,
    });

    // Award 0.15 reputation for SOP contribution
    if (auth.agentId) {
      await stores.reputation.upsert(auth.agentId, 0.15, "Contributed ExpertSOP");
    }

    return c.json({ data: created }, 201);
  });

  // GET /v1/sop — Search SOPs
  app.get("/", async (c) => {
    const query = c.req.query("q");
    const domain = c.req.query("domain");
    const status = c.req.query("status") as StoredSOP["status"] | undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const result = await stores.sop.search({
      query,
      domain,
      status,
      pagination: { offset, limit },
    });

    return c.json(result);
  });

  // GET /v1/sop/:id — Get by ID
  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const sop = await stores.sop.getById(id);
    if (!sop) {
      return c.json({ error: "SOP not found" }, 404);
    }
    return c.json({ data: sop });
  });

  // PUT /v1/sop/:id — Update (creates new version)
  app.put("/:id", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const existing = await stores.sop.getById(id);
    if (!existing) {
      return c.json({ error: "SOP not found" }, 404);
    }

    // Only owner or admin can update
    const isOwner = existing.sop.metadata.agent_id === auth.agentId;
    const isAdmin = auth.apiKey?.scopes.includes("admin") ?? false;
    if (!isOwner && !isAdmin) {
      return c.json({ error: "Forbidden: only owner or admin can update" }, 403);
    }

    const body = await c.req.json();

    // Validate with ExpertSOPSchema
    const parsed = ExpertSOPSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid ExpertSOP",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const updated = await stores.sop.update(id, {
      sop: parsed.data,
      version: newVersion,
      previous_version_id: existing.id,
      status: "draft",
      updated_at: now,
    });

    // Add version entry
    await stores.sop.addVersion({
      sop_id: id,
      version: newVersion,
      diff_summary: `Updated to version ${newVersion}`,
      created_at: now,
    });

    return c.json({ data: updated });
  });

  // GET /v1/sop/:id/versions — Version history
  app.get("/:id/versions", async (c) => {
    const id = c.req.param("id");
    const sop = await stores.sop.getById(id);
    if (!sop) {
      return c.json({ error: "SOP not found" }, 404);
    }

    const versions = await stores.sop.getVersions(id);
    return c.json({ data: versions });
  });

  // POST /v1/sop/:id/approve — Approve SOP
  app.post("/:id/approve", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Admin scope required" }, 403);
    }

    const id = c.req.param("id");
    const existing = await stores.sop.getById(id);
    if (!existing) {
      return c.json({ error: "SOP not found" }, 404);
    }

    const now = new Date().toISOString();
    const updated = await stores.sop.update(id, {
      status: "approved",
      approved_by: auth.agentId,
      updated_at: now,
    });

    return c.json({ data: updated });
  });

  // POST /v1/sop/:id/export-skill — Generate SKILL.md
  app.post("/:id/export-skill", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const existing = await stores.sop.getById(id);
    if (!existing) {
      return c.json({ error: "SOP not found" }, 404);
    }

    // Convert decision_tree to SKILL.md body
    const sop = existing.sop;
    const bodyLines: string[] = [`# ${sop.name}`, "", `Domain: ${sop.domain}`, ""];

    bodyLines.push("## Decision Tree", "");
    for (const node of sop.decision_tree) {
      bodyLines.push(`### ${node.step}`, "");
      bodyLines.push(node.instruction, "");
      if (node.criteria) {
        bodyLines.push("**Criteria:**", "");
        for (const [key, val] of Object.entries(node.criteria)) {
          bodyLines.push(`- ${key}: ${val}`);
        }
        bodyLines.push("");
      }
      if (node.conditions) {
        bodyLines.push("**Conditions:**", "");
        for (const [key, val] of Object.entries(node.conditions)) {
          bodyLines.push(`- ${key}: ${val.action}${val.sla_min ? ` (SLA: ${val.sla_min} min)` : ""}`);
        }
        bodyLines.push("");
      }
      if (node.tool_suggestions) {
        bodyLines.push("**Tool Suggestions:**", "");
        for (const tool of node.tool_suggestions) {
          bodyLines.push(`- ${tool.name}: ${tool.when}`);
        }
        bodyLines.push("");
      }
    }

    const skillBody = bodyLines.join("\n");

    // Use generateSkillMd from SDK
    const skillMdContent = generateSkillMd(
      {
        name: sop.name,
        description: `Expert SOP for ${sop.domain}: ${sop.name}`,
        version: `${existing.version}.0.0`,
        author: sop.source.expert_id,
        tags: [sop.domain, "sop", "expert"],
      },
      skillBody,
      {
        domain: sop.domain,
        knowledge_capture: true,
        visibility: existing.visibility,
      },
    );

    // Create skill in skill store
    const now = new Date().toISOString();
    const skillId = generateSkillId();
    const skill: StoredSkill = {
      id: skillId,
      name: sop.name,
      description: `Expert SOP for ${sop.domain}: ${sop.name}`,
      version: `${existing.version}.0.0`,
      author: sop.source.expert_id,
      tags: [sop.domain, "sop", "expert"],
      content: skillMdContent,
      visibility: existing.visibility,
      quality_score: sop.metadata.quality_score,
      created_at: now,
      updated_at: now,
    };

    await stores.skills.create(skill);

    return c.json({
      data: {
        skill_id: skillId,
        skill_md: skillMdContent,
        sop_id: id,
        sop_version: existing.version,
      },
    });
  });

  // DELETE /v1/sop/:id — Delete SOP
  app.delete("/:id", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const existing = await stores.sop.getById(id);
    if (!existing) {
      return c.json({ error: "SOP not found" }, 404);
    }

    // Only owner or admin can delete
    const isOwner = existing.sop.metadata.agent_id === auth.agentId;
    const isAdmin = auth.apiKey?.scopes.includes("admin") ?? false;
    if (!isOwner && !isAdmin) {
      return c.json({ error: "Forbidden: only owner or admin can delete" }, 403);
    }

    await stores.sop.delete(id);

    return c.json({
      deleted: true,
      sop_id: id,
      deleted_at: new Date().toISOString(),
      deleted_by: auth.agentId,
    });
  });

  return app;
}
