import { generateSkillId, parseSkillMd } from "@knowledgepulse/sdk";
import { Hono } from "hono";
import type { AuthContext } from "../middleware/auth.js";
import type { AllStores, StoredSkill } from "../store/interfaces.js";

export function skillRoutes(stores: AllStores) {
  const app = new Hono();

  // GET /v1/skills — Search/list skills
  app.get("/", async (c) => {
    const query = c.req.query("q");
    const domain = c.req.query("domain");
    const tags = c.req.query("tags")?.split(",").filter(Boolean);
    const minQuality = c.req.query("min_quality") ? Number(c.req.query("min_quality")) : undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const result = await stores.skills.search({
      query,
      domain,
      tags,
      min_quality: minQuality,
      pagination: { offset, limit },
    });

    return c.json(result);
  });

  // GET /v1/skills/:id — Get skill by ID
  app.get("/:id", async (c) => {
    const skill = await stores.skills.getById(c.req.param("id"));
    if (!skill) {
      return c.json({ error: "Skill not found" }, 404);
    }
    return c.json({ data: skill });
  });

  // POST /v1/skills — Contribute a new skill
  app.post("/", async (c) => {
    const auth: AuthContext = c.get("auth");
    if (!auth.authenticated) {
      return c.json({ error: "Authentication required for write operations" }, 401);
    }
    if (!auth.apiKey?.scopes.includes("write") && !auth.apiKey?.scopes.includes("admin")) {
      return c.json({ error: "Write scope required" }, 403);
    }

    // Use sanitized body if available
    const body = c.get("sanitizedBody") ?? (await c.req.json());
    const { skill_md_content, visibility = "network" } = body;

    if (!skill_md_content || typeof skill_md_content !== "string") {
      return c.json({ error: "skill_md_content is required" }, 400);
    }

    let parsed: ReturnType<typeof parseSkillMd>;
    try {
      parsed = parseSkillMd(skill_md_content);
    } catch (e) {
      return c.json(
        { error: "Invalid SKILL.md format", details: e instanceof Error ? e.message : String(e) },
        400,
      );
    }

    const now = new Date().toISOString();
    const skill: StoredSkill = {
      id: generateSkillId(),
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description,
      version: parsed.frontmatter.version,
      author: parsed.frontmatter.author,
      tags: parsed.frontmatter.tags ?? [],
      content: skill_md_content,
      visibility,
      quality_score: (auth.apiKey?.scopes.includes("admin") && typeof body.quality_score === "number")
        ? Math.min(1, Math.max(0, body.quality_score))
        : 0.5,
      created_at: now,
      updated_at: now,
    };

    const created = await stores.skills.create(skill);

    // Award reputation for contribution
    if (auth.agentId) {
      await stores.reputation.upsert(auth.agentId, 0.1, "Contributed skill");
    }

    const warnings = c.get("sanitizerWarnings");
    return c.json(
      {
        data: created,
        ...(warnings && { warnings }),
      },
      201,
    );
  });

  return app;
}
