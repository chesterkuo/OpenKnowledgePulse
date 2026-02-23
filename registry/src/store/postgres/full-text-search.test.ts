import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { StoredKnowledgeUnit, StoredSkill } from "../interfaces.js";
import { type PgPool, createPool, runMigrations } from "./db.js";
import { PgKnowledgeStore } from "./knowledge-store.js";
import { PgSkillStore } from "./skill-store.js";

const DATABASE_URL = process.env.KP_TEST_DATABASE_URL;

if (!DATABASE_URL) {
  describe.skip("PostgreSQL Full-Text Search (KP_TEST_DATABASE_URL not set)", () => {
    test("skipped", () => {});
  });
} else {
  // ── Helpers ───────────────────────────────────────────

  function makeSkill(overrides: Partial<StoredSkill> = {}): StoredSkill {
    const now = new Date().toISOString();
    return {
      id: `kp:skill:fts-${crypto.randomUUID()}`,
      name: "Test Skill",
      description: "A test skill for unit testing",
      version: "1.0.0",
      author: "test-agent",
      tags: ["testing"],
      content: "---\nname: Test Skill\n---\n\n# Test",
      visibility: "network",
      quality_score: 0.8,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  function makeKU(overrides: Partial<StoredKnowledgeUnit> = {}): StoredKnowledgeUnit {
    const now = new Date().toISOString();
    return {
      id: `kp:ku:fts-${crypto.randomUUID()}`,
      unit: {
        "@type": "ReasoningTrace",
        task: {
          objective: "Solve a math problem",
          constraints: [],
          context: {},
        },
        steps: [
          {
            step_number: 1,
            action: "think",
            content: "Step 1 reasoning",
            timestamp: now,
          },
        ],
        outcome: { success: true, result: "42" },
        metadata: {
          agent_id: "agent-fts-test",
          timestamp: now,
          quality_score: 0.85,
          task_domain: "math",
        },
      },
      visibility: "network",
      created_at: now,
      updated_at: now,
      ...overrides,
    } as StoredKnowledgeUnit;
  }

  // ── Tests ─────────────────────────────────────────────

  describe("PostgreSQL Full-Text Search", () => {
    let pool: PgPool;
    let skillStore: PgSkillStore;
    let kuStore: PgKnowledgeStore;

    beforeAll(async () => {
      pool = createPool(DATABASE_URL);
      await runMigrations(pool);
      skillStore = new PgSkillStore(pool);
      kuStore = new PgKnowledgeStore(pool);
    });

    afterAll(async () => {
      // Clean up FTS test data (scoped by prefix)
      await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");
      await pool.query("DELETE FROM knowledge_units WHERE id LIKE 'kp:ku:fts-%'");
      await pool.end();
    });

    // ── Skills Full-Text Search ──────────────────────────

    describe("Skills full-text search", () => {
      beforeAll(async () => {
        // Clean slate for skill FTS tests
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(
          makeSkill({
            name: "React Component Generator",
            description: "Generates reusable React components from specifications",
            tags: ["react", "frontend"],
            quality_score: 0.9,
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "Python Data Pipeline",
            description: "Creates ETL data pipelines using Python and Pandas",
            tags: ["python", "backend"],
            quality_score: 0.7,
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "Kubernetes Deployment Automation",
            description: "Automates deploying microservices to Kubernetes clusters",
            tags: ["devops", "kubernetes"],
            quality_score: 0.85,
          }),
        );
      });

      test("finds skills by name keyword", async () => {
        const result = await skillStore.search({ query: "React" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("React Component Generator");
      });

      test("finds skills by description keyword", async () => {
        const result = await skillStore.search({ query: "pipelines" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("Python Data Pipeline");
      });

      test("finds skills by description keyword (microservices)", async () => {
        const result = await skillStore.search({ query: "microservices" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("Kubernetes Deployment Automation");
      });

      test("ranks name match higher than description match", async () => {
        // Insert a skill where "pipeline" appears only in description
        // and another where "pipeline" appears in name
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(
          makeSkill({
            name: "Pipeline Orchestrator",
            description: "A generic tool for task management",
            quality_score: 0.5, // lower quality but name match
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "Data Processor",
            description: "Builds data pipeline workflows for complex transformations",
            quality_score: 0.95, // higher quality but only description match
          }),
        );

        const result = await skillStore.search({ query: "pipeline" });
        expect(result.total).toBe(2);
        // Name match (weight A) should rank higher than description match (weight B)
        expect(result.data[0]!.name).toBe("Pipeline Orchestrator");
        expect(result.data[1]!.name).toBe("Data Processor");
      });

      test("returns empty for non-matching query", async () => {
        const result = await skillStore.search({ query: "quantum entanglement" });
        expect(result.total).toBe(0);
        expect(result.data).toHaveLength(0);
      });

      test("combines full-text search with tag filter", async () => {
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(
          makeSkill({
            name: "React Testing Library Guide",
            description: "How to test React components",
            tags: ["react", "testing"],
            quality_score: 0.8,
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "React Performance Optimization",
            description: "Optimize React rendering performance",
            tags: ["react", "performance"],
            quality_score: 0.9,
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "Vue Testing Guide",
            description: "How to test Vue components",
            tags: ["vue", "testing"],
            quality_score: 0.75,
          }),
        );

        // Search for "testing" but only with "react" tag
        const result = await skillStore.search({ query: "testing", tags: ["react"] });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("React Testing Library Guide");
      });

      test("combines full-text search with min_quality filter", async () => {
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(
          makeSkill({
            name: "React Hooks Tutorial",
            description: "Learn React hooks patterns",
            quality_score: 0.9,
          }),
        );
        await skillStore.create(
          makeSkill({
            name: "React Basics",
            description: "Introduction to React concepts",
            quality_score: 0.4,
          }),
        );

        const result = await skillStore.search({ query: "React", min_quality: 0.8 });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("React Hooks Tutorial");
      });

      test("falls back to ILIKE for short queries (< 2 chars)", async () => {
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(
          makeSkill({
            name: "R Language Statistics",
            description: "Statistical analysis with R",
          }),
        );

        // Single character query should use ILIKE fallback
        const result = await skillStore.search({ query: "R" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.name).toBe("R Language Statistics");
      });

      test("search without query still orders by quality_score DESC", async () => {
        await pool.query("DELETE FROM skills WHERE id LIKE 'kp:skill:fts-%'");

        await skillStore.create(makeSkill({ name: "Low Quality", quality_score: 0.3 }));
        await skillStore.create(makeSkill({ name: "High Quality", quality_score: 0.95 }));
        await skillStore.create(makeSkill({ name: "Mid Quality", quality_score: 0.6 }));

        const result = await skillStore.search({});
        expect(result.data[0]!.name).toBe("High Quality");
        expect(result.data[1]!.name).toBe("Mid Quality");
        expect(result.data[2]!.name).toBe("Low Quality");
      });
    });

    // ── Knowledge Units Full-Text Search ─────────────────

    describe("Knowledge Units full-text search", () => {
      beforeAll(async () => {
        await pool.query("DELETE FROM knowledge_units WHERE id LIKE 'kp:ku:fts-%'");

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Optimize database query performance",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "optimized" },
              metadata: {
                agent_id: "agent-fts-1",
                timestamp: new Date().toISOString(),
                quality_score: 0.9,
                task_domain: "databases",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ToolCallPattern",
              name: "deploy-tool",
              description: "Deployment automation pattern",
              parameters: [],
              examples: [],
              metadata: {
                agent_id: "agent-fts-2",
                timestamp: new Date().toISOString(),
                quality_score: 0.8,
                task_domain: "devops",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Implement machine learning classification model",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "model trained" },
              metadata: {
                agent_id: "agent-fts-3",
                timestamp: new Date().toISOString(),
                quality_score: 0.85,
                task_domain: "machine-learning",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );
      });

      test("finds knowledge units by domain keyword", async () => {
        const result = await kuStore.search({ query: "databases" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit.metadata.task_domain).toBe("databases");
      });

      test("finds knowledge units by objective text", async () => {
        const result = await kuStore.search({ query: "machine learning classification" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit.metadata.task_domain).toBe("machine-learning");
      });

      test("finds knowledge units by type keyword", async () => {
        const result = await kuStore.search({ query: "ToolCallPattern" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit.metadata.task_domain).toBe("devops");
      });

      test("returns empty for non-matching query", async () => {
        const result = await kuStore.search({ query: "quantum cryptography protocols" });
        expect(result.total).toBe(0);
        expect(result.data).toHaveLength(0);
      });

      test("combines full-text search with domain filter", async () => {
        await pool.query("DELETE FROM knowledge_units WHERE id LIKE 'kp:ku:fts-%'");

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Optimize database indexing strategy",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "indexed" },
              metadata: {
                agent_id: "agent-fts-4",
                timestamp: new Date().toISOString(),
                quality_score: 0.9,
                task_domain: "databases",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Optimize CI/CD pipeline for database migrations",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "pipeline optimized" },
              metadata: {
                agent_id: "agent-fts-5",
                timestamp: new Date().toISOString(),
                quality_score: 0.85,
                task_domain: "devops",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        // Both match "optimize" + "database", but domain filter narrows to "databases" only
        const result = await kuStore.search({ query: "optimize", domain: "databases" });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit.metadata.task_domain).toBe("databases");
      });

      test("combines full-text search with types filter", async () => {
        await pool.query("DELETE FROM knowledge_units WHERE id LIKE 'kp:ku:fts-%'");

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Deploy application to production",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "deployed" },
              metadata: {
                agent_id: "agent-fts-6",
                timestamp: new Date().toISOString(),
                quality_score: 0.9,
                task_domain: "devops",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ToolCallPattern",
              name: "deploy-tool",
              description: "Deployment helper",
              parameters: [],
              examples: [],
              metadata: {
                agent_id: "agent-fts-7",
                timestamp: new Date().toISOString(),
                quality_score: 0.8,
                task_domain: "devops",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        // Search for "deploy" but only ReasoningTrace type
        const result = await kuStore.search({ query: "deploy", types: ["ReasoningTrace"] });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit["@type"]).toBe("ReasoningTrace");
      });

      test("combines full-text search with min_quality filter", async () => {
        await pool.query("DELETE FROM knowledge_units WHERE id LIKE 'kp:ku:fts-%'");

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Build authentication system",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "done" },
              metadata: {
                agent_id: "agent-fts-8",
                timestamp: new Date().toISOString(),
                quality_score: 0.95,
                task_domain: "security",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: {
                objective: "Basic authentication tutorial",
                constraints: [],
                context: {},
              },
              steps: [],
              outcome: { success: true, result: "done" },
              metadata: {
                agent_id: "agent-fts-9",
                timestamp: new Date().toISOString(),
                quality_score: 0.3,
                task_domain: "tutorials",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        const result = await kuStore.search({ query: "authentication", min_quality: 0.8 });
        expect(result.total).toBe(1);
        expect(result.data[0]!.unit.metadata.quality_score).toBe(0.95);
      });

      test("search without query still orders by quality_score DESC", async () => {
        // Clean all knowledge_units to get deterministic results
        await pool.query("DELETE FROM knowledge_units");

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: { objective: "Low quality task", constraints: [], context: {} },
              steps: [],
              outcome: { success: true, result: "ok" },
              metadata: {
                agent_id: "agent-fts-10",
                timestamp: new Date().toISOString(),
                quality_score: 0.3,
                task_domain: "general",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        await kuStore.create(
          makeKU({
            unit: {
              "@type": "ReasoningTrace",
              task: { objective: "High quality task", constraints: [], context: {} },
              steps: [],
              outcome: { success: true, result: "ok" },
              metadata: {
                agent_id: "agent-fts-11",
                timestamp: new Date().toISOString(),
                quality_score: 0.95,
                task_domain: "general",
              },
            } as StoredKnowledgeUnit["unit"],
          }),
        );

        const result = await kuStore.search({});
        expect(result.total).toBe(2);
        expect(result.data[0]!.unit.metadata.quality_score).toBe(0.95);
        expect(result.data[1]!.unit.metadata.quality_score).toBe(0.3);
      });
    });
  });
} // end if (DATABASE_URL)
