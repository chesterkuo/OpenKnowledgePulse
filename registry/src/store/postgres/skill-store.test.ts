import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { StoredSkill } from "../interfaces.js";
import { type PgPool, createPool, runMigrations } from "./db.js";
import { PgSkillStore } from "./skill-store.js";

const DATABASE_URL = process.env.KP_TEST_DATABASE_URL;

if (!DATABASE_URL) {
  describe.skip("PgSkillStore (KP_TEST_DATABASE_URL not set)", () => {
    test("skipped", () => {});
  });
} else {
  // ── Helpers ───────────────────────────────────────────

  function makeSkill(overrides: Partial<StoredSkill> = {}): StoredSkill {
    const now = new Date().toISOString();
    return {
      id: `kp:skill:${crypto.randomUUID()}`,
      name: "Test Skill",
      description: "A test skill for unit testing",
      version: "1.0.0",
      author: "test-agent",
      tags: ["testing", "unit-test"],
      content: "---\nname: Test Skill\n---\n\n# Test",
      visibility: "network",
      quality_score: 0.8,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  // ── Tests ─────────────────────────────────────────────

  describe("PgSkillStore", () => {
    let pool: PgPool;
    let store: PgSkillStore;

    beforeAll(async () => {
      pool = createPool(DATABASE_URL);
      await runMigrations(pool);
      // Clean skills table before test run
      await pool.query("DELETE FROM skills");
      store = new PgSkillStore(pool);
    });

    afterAll(async () => {
      // Clean up after tests
      await pool.query("DELETE FROM skills");
      await pool.end();
    });

    // 1. Creates and retrieves a skill
    test("create + getById should store and retrieve a skill", async () => {
      const skill = makeSkill();
      const created = await store.create(skill);

      expect(created).toEqual(skill);

      const retrieved = await store.getById(skill.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(skill.id);
      expect(retrieved!.name).toBe(skill.name);
      expect(retrieved!.tags).toEqual(skill.tags);
      expect(retrieved!.quality_score).toBe(skill.quality_score);
      expect(retrieved!.visibility).toBe(skill.visibility);
      expect(retrieved!.version).toBe(skill.version);
      expect(retrieved!.author).toBe(skill.author);
    });

    // 2. Searches by query (ILIKE)
    test("search with query should match name and description (ILIKE)", async () => {
      // Clean slate for this test
      await pool.query("DELETE FROM skills");

      const skillA = makeSkill({
        name: "React Component Generator",
        description: "Generates React components from specs",
        tags: ["react", "frontend"],
        quality_score: 0.9,
      });
      const skillB = makeSkill({
        name: "Python Data Pipeline",
        description: "Creates data pipelines using Python",
        tags: ["python", "backend"],
        quality_score: 0.7,
      });
      await store.create(skillA);
      await store.create(skillB);

      // Match by name
      const byName = await store.search({ query: "React" });
      expect(byName.total).toBe(1);
      expect(byName.data[0]!.name).toBe("React Component Generator");

      // Match by description
      const byDesc = await store.search({ query: "pipelines" });
      expect(byDesc.total).toBe(1);
      expect(byDesc.data[0]!.name).toBe("Python Data Pipeline");
    });

    // 3. Searches by tags
    test("search with tags should filter using JSONB overlap", async () => {
      await pool.query("DELETE FROM skills");

      await store.create(makeSkill({ tags: ["react", "frontend"], name: "React Skill" }));
      await store.create(makeSkill({ tags: ["python", "backend"], name: "Python Skill" }));

      const result = await store.search({ tags: ["frontend"] });
      expect(result.total).toBe(1);
      expect(result.data[0]!.name).toBe("React Skill");

      // Multiple tag match (overlap — any match)
      const multi = await store.search({ tags: ["frontend", "backend"] });
      expect(multi.total).toBe(2);
    });

    // 4. Filters by min_quality
    test("search with min_quality should filter correctly", async () => {
      await pool.query("DELETE FROM skills");

      await store.create(makeSkill({ quality_score: 0.9 }));
      await store.create(makeSkill({ quality_score: 0.5 }));

      const result = await store.search({ min_quality: 0.8 });
      expect(result.total).toBe(1);
      expect(result.data[0]!.quality_score).toBe(0.9);
    });

    // 5. Paginates results
    test("search should apply pagination with total count", async () => {
      await pool.query("DELETE FROM skills");

      await store.create(makeSkill({ quality_score: 0.9 }));
      await store.create(makeSkill({ quality_score: 0.7 }));
      await store.create(makeSkill({ quality_score: 0.5 }));

      const result = await store.search({ pagination: { offset: 1, limit: 1 } });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      // Sorted by quality_score DESC, so offset 1 should be 0.7
      expect(result.data[0]!.quality_score).toBe(0.7);
    });

    // 6. Deletes a skill
    test("delete should remove a skill and return true", async () => {
      await pool.query("DELETE FROM skills");

      const skill = makeSkill();
      await store.create(skill);

      const deleted = await store.delete(skill.id);
      expect(deleted).toBe(true);

      const retrieved = await store.getById(skill.id);
      expect(retrieved).toBeUndefined();
    });

    // 7. Returns undefined for missing id
    test("getById should return undefined for nonexistent skill", async () => {
      const result = await store.getById("kp:skill:nonexistent-id-12345");
      expect(result).toBeUndefined();
    });

    // 8. Upserts on duplicate id
    test("create should upsert on duplicate id (ON CONFLICT DO UPDATE)", async () => {
      await pool.query("DELETE FROM skills");

      const id = "kp:skill:fixed-upsert-id";
      const skill1 = makeSkill({ id, name: "Original", quality_score: 0.5 });
      const skill2 = makeSkill({ id, name: "Updated", quality_score: 0.9 });

      await store.create(skill1);
      await store.create(skill2);

      const retrieved = await store.getById(id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe("Updated");
      expect(retrieved!.quality_score).toBe(0.9);
    });

    // Extra: delete returns false for nonexistent
    test("delete should return false for nonexistent skill", async () => {
      const deleted = await store.delete("kp:skill:nonexistent-delete-id");
      expect(deleted).toBe(false);
    });

    // Extra: search results sorted by quality_score DESC
    test("search results should be sorted by quality_score descending", async () => {
      await pool.query("DELETE FROM skills");

      await store.create(makeSkill({ quality_score: 0.5 }));
      await store.create(makeSkill({ quality_score: 0.9 }));
      await store.create(makeSkill({ quality_score: 0.7 }));

      const result = await store.search({});
      expect(result.data[0]!.quality_score).toBe(0.9);
      expect(result.data[1]!.quality_score).toBe(0.7);
      expect(result.data[2]!.quality_score).toBe(0.5);
    });
  });
} // end if (DATABASE_URL)
