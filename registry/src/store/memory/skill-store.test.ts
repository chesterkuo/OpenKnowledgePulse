import { beforeEach, describe, expect, test } from "bun:test";
import type { StoredSkill } from "../interfaces.js";
import { MemorySkillStore } from "./skill-store.js";

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

describe("MemorySkillStore", () => {
  let store: MemorySkillStore;

  beforeEach(() => {
    store = new MemorySkillStore();
  });

  describe("create", () => {
    test("should store a skill and return it", async () => {
      const skill = makeSkill();
      const created = await store.create(skill);

      expect(created).toEqual(skill);
      expect(created.id).toBe(skill.id);
      expect(created.name).toBe("Test Skill");
    });

    test("should overwrite a skill with the same id", async () => {
      const id = "kp:skill:fixed-id";
      const skill1 = makeSkill({ id, name: "Original" });
      const skill2 = makeSkill({ id, name: "Updated" });

      await store.create(skill1);
      await store.create(skill2);

      const retrieved = await store.getById(id);
      expect(retrieved?.name).toBe("Updated");
    });
  });

  describe("getById", () => {
    test("should return the skill when it exists", async () => {
      const skill = makeSkill();
      await store.create(skill);

      const result = await store.getById(skill.id);
      expect(result).toEqual(skill);
    });

    test("should return undefined when skill does not exist", async () => {
      const result = await store.getById("kp:skill:nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("search", () => {
    let skillA: StoredSkill;
    let skillB: StoredSkill;
    let skillC: StoredSkill;

    beforeEach(async () => {
      skillA = makeSkill({
        name: "React Component Generator",
        description: "Generates React components from specs",
        tags: ["react", "frontend", "code-generation"],
        quality_score: 0.9,
      });
      skillB = makeSkill({
        name: "Python Data Pipeline",
        description: "Creates data pipelines using Python",
        tags: ["python", "data", "backend"],
        quality_score: 0.7,
      });
      skillC = makeSkill({
        name: "API Documentation Writer",
        description: "Writes API docs from OpenAPI specs",
        tags: ["documentation", "api", "frontend"],
        quality_score: 0.5,
      });
      await store.create(skillA);
      await store.create(skillB);
      await store.create(skillC);
    });

    test("should return all skills when no filters are applied", async () => {
      const result = await store.search({});
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
    });

    test("should sort results by quality_score descending", async () => {
      const result = await store.search({});
      expect(result.data[0]?.quality_score).toBe(0.9);
      expect(result.data[1]?.quality_score).toBe(0.7);
      expect(result.data[2]?.quality_score).toBe(0.5);
    });

    test("should filter by query matching name", async () => {
      const result = await store.search({ query: "React" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("React Component Generator");
    });

    test("should filter by query matching description", async () => {
      const result = await store.search({ query: "pipelines" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("Python Data Pipeline");
    });

    test("should filter by query matching tags", async () => {
      const result = await store.search({ query: "documentation" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("API Documentation Writer");
    });

    test("should be case-insensitive when searching by query", async () => {
      const result = await store.search({ query: "react" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("React Component Generator");
    });

    test("should filter by tags", async () => {
      const result = await store.search({ tags: ["frontend"] });
      expect(result.total).toBe(2);
      const names = result.data.map((s) => s.name);
      expect(names).toContain("React Component Generator");
      expect(names).toContain("API Documentation Writer");
    });

    test("should filter by tags case-insensitively", async () => {
      const result = await store.search({ tags: ["PYTHON"] });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("Python Data Pipeline");
    });

    test("should filter by min_quality", async () => {
      const result = await store.search({ min_quality: 0.8 });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("React Component Generator");
    });

    test("should filter by min_quality including exact matches", async () => {
      const result = await store.search({ min_quality: 0.7 });
      expect(result.total).toBe(2);
    });

    test("should combine multiple filters", async () => {
      const result = await store.search({
        tags: ["frontend"],
        min_quality: 0.8,
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.name).toBe("React Component Generator");
    });

    test("should apply pagination with offset and limit", async () => {
      const result = await store.search({
        pagination: { offset: 1, limit: 1 },
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      // Second highest quality_score is 0.7
      expect(result.data[0]?.quality_score).toBe(0.7);
    });

    test("should default pagination to offset=0, limit=20", async () => {
      const result = await store.search({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
    });

    test("should return empty results when no matches", async () => {
      const result = await store.search({ query: "nonexistent" });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("delete", () => {
    test("should remove an existing skill and return true", async () => {
      const skill = makeSkill();
      await store.create(skill);

      const deleted = await store.delete(skill.id);
      expect(deleted).toBe(true);

      const retrieved = await store.getById(skill.id);
      expect(retrieved).toBeUndefined();
    });

    test("should return false when skill does not exist", async () => {
      const deleted = await store.delete("kp:skill:nonexistent");
      expect(deleted).toBe(false);
    });

    test("should not affect other skills when deleting one", async () => {
      const skill1 = makeSkill({ name: "Skill 1" });
      const skill2 = makeSkill({ name: "Skill 2" });
      await store.create(skill1);
      await store.create(skill2);

      await store.delete(skill1.id);

      const remaining = await store.search({});
      expect(remaining.total).toBe(1);
      expect(remaining.data[0]?.name).toBe("Skill 2");
    });
  });
});
