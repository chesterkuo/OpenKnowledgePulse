import { beforeEach, describe, expect, test } from "bun:test";
import type { ExpertSOP } from "@knowledgepulse/sdk";
import type { SOPVersion, StoredSOP } from "../interfaces.js";
import { MemorySopStore } from "./sop-store.js";

const KP_CONTEXT = "https://openknowledgepulse.org/schema/v1" as const;

function makeExpertSOP(overrides: Partial<ExpertSOP> = {}): ExpertSOP {
  return {
    "@context": KP_CONTEXT,
    "@type": "ExpertSOP",
    id: `kp:sop:${crypto.randomUUID()}`,
    name: "Incident Response SOP",
    domain: "devops",
    metadata: {
      created_at: new Date().toISOString(),
      agent_id: "kp:agent:test-agent",
      task_domain: "devops",
      success: true,
      quality_score: 0.9,
      visibility: "network",
      privacy_level: "federated",
    },
    source: {
      type: "human_expert",
      expert_id: "expert-42",
      credentials: ["kp:sbt:sre-certified"],
    },
    decision_tree: [
      {
        step: "Assess severity",
        instruction: "Determine incident severity level",
      },
    ],
    ...overrides,
  };
}

function makeStoredSOP(overrides: Partial<StoredSOP> = {}): StoredSOP {
  const sop = overrides.sop ?? makeExpertSOP();
  const now = new Date().toISOString();
  return {
    id: sop.id,
    sop,
    version: 1,
    status: "draft",
    visibility: "network",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("MemorySopStore", () => {
  let store: MemorySopStore;

  beforeEach(() => {
    store = new MemorySopStore();
  });

  // ── create + getById ──────────────────────────────────

  describe("create + getById", () => {
    test("should store a SOP and return it", async () => {
      const stored = makeStoredSOP();
      const created = await store.create(stored);

      expect(created).toEqual(stored);
      expect(created.id).toBe(stored.id);
      expect(created.sop.name).toBe("Incident Response SOP");
    });

    test("should retrieve a created SOP by id", async () => {
      const stored = makeStoredSOP();
      await store.create(stored);

      const result = await store.getById(stored.id);
      expect(result).toEqual(stored);
    });

    test("should return undefined for nonexistent id", async () => {
      const result = await store.getById("kp:sop:nonexistent");
      expect(result).toBeUndefined();
    });

    test("should overwrite a SOP with the same id", async () => {
      const id = "kp:sop:fixed-id";
      const sop1 = makeExpertSOP({ id, name: "Original" });
      const sop2 = makeExpertSOP({ id, name: "Updated" });

      await store.create(makeStoredSOP({ id, sop: sop1 }));
      await store.create(makeStoredSOP({ id, sop: sop2 }));

      const result = await store.getById(id);
      expect(result?.sop.name).toBe("Updated");
    });
  });

  // ── search by domain ──────────────────────────────────

  describe("search by domain", () => {
    test("should filter SOPs by domain", async () => {
      const devopsSop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops" }),
      });
      const securitySop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "security" }),
      });
      await store.create(devopsSop);
      await store.create(securitySop);

      const result = await store.search({ domain: "devops" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.sop.domain).toBe("devops");
    });

    test("should be case-insensitive when filtering by domain", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "DevOps" }),
      });
      await store.create(sop);

      const result = await store.search({ domain: "devops" });
      expect(result.total).toBe(1);
    });
  });

  // ── search by status ──────────────────────────────────

  describe("search by status", () => {
    test("should filter SOPs by status", async () => {
      const draft = makeStoredSOP({ status: "draft" });
      const approved = makeStoredSOP({ status: "approved" });
      const rejected = makeStoredSOP({ status: "rejected" });
      await store.create(draft);
      await store.create(approved);
      await store.create(rejected);

      const result = await store.search({ status: "approved" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.status).toBe("approved");
    });

    test("should filter by pending_review status", async () => {
      const pending = makeStoredSOP({ status: "pending_review" });
      const draft = makeStoredSOP({ status: "draft" });
      await store.create(pending);
      await store.create(draft);

      const result = await store.search({ status: "pending_review" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.status).toBe("pending_review");
    });
  });

  // ── search by query ───────────────────────────────────

  describe("search by query", () => {
    test("should match query against SOP name", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ name: "Database Migration Guide" }),
      });
      await store.create(sop);

      const result = await store.search({ query: "Migration" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.sop.name).toBe("Database Migration Guide");
    });

    test("should match query against SOP domain", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "infrastructure" }),
      });
      await store.create(sop);

      const result = await store.search({ query: "infrastructure" });
      expect(result.total).toBe(1);
    });

    test("should match query against decision tree step text", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({
          decision_tree: [
            {
              step: "Check disk space",
              instruction: "Verify available disk space on all nodes",
            },
          ],
        }),
      });
      await store.create(sop);

      const result = await store.search({ query: "disk space" });
      expect(result.total).toBe(1);
    });

    test("should match query against decision tree instruction", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({
          decision_tree: [
            {
              step: "Step 1",
              instruction: "Run the kubernetes health check",
            },
          ],
        }),
      });
      await store.create(sop);

      const result = await store.search({ query: "kubernetes" });
      expect(result.total).toBe(1);
    });

    test("should be case-insensitive for query search", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ name: "Deployment Checklist" }),
      });
      await store.create(sop);

      const result = await store.search({ query: "deployment" });
      expect(result.total).toBe(1);
    });

    test("should return empty results when query matches nothing", async () => {
      const sop = makeStoredSOP();
      await store.create(sop);

      const result = await store.search({ query: "nonexistent-xyz-abc" });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  // ── search with combined filters ──────────────────────

  describe("search with combined filters", () => {
    test("should combine domain and status filters", async () => {
      const devopsApproved = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops" }),
        status: "approved",
      });
      const devopsDraft = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops" }),
        status: "draft",
      });
      const securityApproved = makeStoredSOP({
        sop: makeExpertSOP({ domain: "security" }),
        status: "approved",
      });
      await store.create(devopsApproved);
      await store.create(devopsDraft);
      await store.create(securityApproved);

      const result = await store.search({ domain: "devops", status: "approved" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.sop.domain).toBe("devops");
      expect(result.data[0]?.status).toBe("approved");
    });

    test("should combine query and status filters", async () => {
      const approvedSop = makeStoredSOP({
        sop: makeExpertSOP({ name: "Backup Procedure" }),
        status: "approved",
      });
      const draftSop = makeStoredSOP({
        sop: makeExpertSOP({ name: "Backup Strategy" }),
        status: "draft",
      });
      await store.create(approvedSop);
      await store.create(draftSop);

      const result = await store.search({ query: "Backup", status: "approved" });
      expect(result.total).toBe(1);
      expect(result.data[0]?.sop.name).toBe("Backup Procedure");
    });

    test("should return all SOPs when no filters are applied", async () => {
      await store.create(makeStoredSOP());
      await store.create(makeStoredSOP());
      await store.create(makeStoredSOP());

      const result = await store.search({});
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
    });
  });

  // ── update ────────────────────────────────────────────

  describe("update", () => {
    test("should update status of an existing SOP", async () => {
      const sop = makeStoredSOP({ status: "draft" });
      await store.create(sop);

      const updated = await store.update(sop.id, { status: "approved" });
      expect(updated).toBeDefined();
      expect(updated!.status).toBe("approved");
      // Other fields should remain unchanged
      expect(updated!.sop.name).toBe(sop.sop.name);
    });

    test("should update approved_by field", async () => {
      const sop = makeStoredSOP({ status: "pending_review" });
      await store.create(sop);

      const updated = await store.update(sop.id, {
        status: "approved",
        approved_by: "reviewer-1",
      });
      expect(updated!.status).toBe("approved");
      expect(updated!.approved_by).toBe("reviewer-1");
    });

    test("should update visibility", async () => {
      const sop = makeStoredSOP({ visibility: "network" });
      await store.create(sop);

      const updated = await store.update(sop.id, { visibility: "org" });
      expect(updated!.visibility).toBe("org");
    });

    test("should update version and previous_version_id", async () => {
      const sop = makeStoredSOP({ version: 1 });
      await store.create(sop);

      const updated = await store.update(sop.id, {
        version: 2,
        previous_version_id: sop.id,
      });
      expect(updated!.version).toBe(2);
      expect(updated!.previous_version_id).toBe(sop.id);
    });

    test("should persist update for subsequent getById calls", async () => {
      const sop = makeStoredSOP({ status: "draft" });
      await store.create(sop);

      await store.update(sop.id, { status: "approved" });
      const retrieved = await store.getById(sop.id);
      expect(retrieved!.status).toBe("approved");
    });

    test("should return undefined when updating a nonexistent SOP", async () => {
      const result = await store.update("kp:sop:nonexistent", { status: "approved" });
      expect(result).toBeUndefined();
    });
  });

  // ── delete ────────────────────────────────────────────

  describe("delete", () => {
    test("should remove an existing SOP and return true", async () => {
      const sop = makeStoredSOP();
      await store.create(sop);

      const deleted = await store.delete(sop.id);
      expect(deleted).toBe(true);

      const retrieved = await store.getById(sop.id);
      expect(retrieved).toBeUndefined();
    });

    test("should return false when SOP does not exist", async () => {
      const deleted = await store.delete("kp:sop:nonexistent");
      expect(deleted).toBe(false);
    });

    test("should not affect other SOPs when deleting one", async () => {
      const sop1 = makeStoredSOP();
      const sop2 = makeStoredSOP();
      await store.create(sop1);
      await store.create(sop2);

      await store.delete(sop1.id);

      const remaining = await store.search({});
      expect(remaining.total).toBe(1);
      expect(remaining.data[0]?.id).toBe(sop2.id);
    });
  });

  // ── version history (addVersion + getVersions) ────────

  describe("version history", () => {
    test("should add and retrieve versions for a SOP", async () => {
      const sopId = "kp:sop:versioned";
      const version: SOPVersion = {
        sop_id: sopId,
        version: 1,
        diff_summary: "Initial version",
        created_at: new Date().toISOString(),
      };

      await store.addVersion(version);
      const versions = await store.getVersions(sopId);

      expect(versions).toHaveLength(1);
      expect(versions[0]).toEqual(version);
    });

    test("should return multiple versions in order added", async () => {
      const sopId = "kp:sop:multi-version";
      const v1: SOPVersion = {
        sop_id: sopId,
        version: 1,
        diff_summary: "Initial version",
        created_at: "2025-01-01T00:00:00Z",
      };
      const v2: SOPVersion = {
        sop_id: sopId,
        version: 2,
        diff_summary: "Added step 3",
        created_at: "2025-01-02T00:00:00Z",
      };
      const v3: SOPVersion = {
        sop_id: sopId,
        version: 3,
        diff_summary: "Updated criteria",
        created_at: "2025-01-03T00:00:00Z",
      };

      await store.addVersion(v1);
      await store.addVersion(v2);
      await store.addVersion(v3);

      const versions = await store.getVersions(sopId);
      expect(versions).toHaveLength(3);
      expect(versions[0]?.version).toBe(1);
      expect(versions[1]?.version).toBe(2);
      expect(versions[2]?.version).toBe(3);
    });

    test("should return empty array for SOP with no versions", async () => {
      const versions = await store.getVersions("kp:sop:no-versions");
      expect(versions).toHaveLength(0);
    });

    test("should not mix versions between different SOPs", async () => {
      const sopA = "kp:sop:a";
      const sopB = "kp:sop:b";

      await store.addVersion({
        sop_id: sopA,
        version: 1,
        diff_summary: "SOP A v1",
        created_at: new Date().toISOString(),
      });
      await store.addVersion({
        sop_id: sopB,
        version: 1,
        diff_summary: "SOP B v1",
        created_at: new Date().toISOString(),
      });
      await store.addVersion({
        sop_id: sopA,
        version: 2,
        diff_summary: "SOP A v2",
        created_at: new Date().toISOString(),
      });

      const versionsA = await store.getVersions(sopA);
      const versionsB = await store.getVersions(sopB);

      expect(versionsA).toHaveLength(2);
      expect(versionsB).toHaveLength(1);
      expect(versionsA.every((v) => v.sop_id === sopA)).toBe(true);
      expect(versionsB.every((v) => v.sop_id === sopB)).toBe(true);
    });
  });

  // ── getByDomain ───────────────────────────────────────

  describe("getByDomain", () => {
    test("should return all SOPs for a given domain", async () => {
      const devops1 = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops", name: "SOP 1" }),
      });
      const devops2 = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops", name: "SOP 2" }),
      });
      const security = makeStoredSOP({
        sop: makeExpertSOP({ domain: "security", name: "SOP 3" }),
      });

      await store.create(devops1);
      await store.create(devops2);
      await store.create(security);

      const results = await store.getByDomain("devops");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.sop.domain === "devops")).toBe(true);
    });

    test("should be case-insensitive for domain matching", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "DevOps" }),
      });
      await store.create(sop);

      const results = await store.getByDomain("devops");
      expect(results).toHaveLength(1);
    });

    test("should return empty array when no SOPs match the domain", async () => {
      const sop = makeStoredSOP({
        sop: makeExpertSOP({ domain: "devops" }),
      });
      await store.create(sop);

      const results = await store.getByDomain("nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  // ── pagination ────────────────────────────────────────

  describe("pagination", () => {
    beforeEach(async () => {
      // Create 5 SOPs with different quality scores for deterministic ordering
      for (let i = 0; i < 5; i++) {
        const sop = makeStoredSOP({
          sop: makeExpertSOP({
            metadata: {
              created_at: new Date().toISOString(),
              agent_id: "kp:agent:test",
              task_domain: "devops",
              success: true,
              quality_score: 0.5 + i * 0.1, // 0.5, 0.6, 0.7, 0.8, 0.9
              visibility: "network",
              privacy_level: "federated",
            },
          }),
        });
        await store.create(sop);
      }
    });

    test("should default pagination to offset=0, limit=20", async () => {
      const result = await store.search({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(5);
    });

    test("should apply offset and limit", async () => {
      const result = await store.search({
        pagination: { offset: 1, limit: 2 },
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(2);
    });

    test("should return empty data when offset exceeds total", async () => {
      const result = await store.search({
        pagination: { offset: 10, limit: 5 },
      });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(5);
    });

    test("should sort results by quality_score descending", async () => {
      const result = await store.search({});
      const scores = result.data.map((s) => s.sop.metadata.quality_score);
      expect(scores[0]).toBe(0.9);
      expect(scores[4]).toBe(0.5);
      // Verify strictly descending
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
      }
    });

    test("should paginate through results consistently", async () => {
      const page1 = await store.search({ pagination: { offset: 0, limit: 2 } });
      const page2 = await store.search({ pagination: { offset: 2, limit: 2 } });
      const page3 = await store.search({ pagination: { offset: 4, limit: 2 } });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page3.data).toHaveLength(1);

      // All pages should have same total
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // No overlap between pages
      const allIds = [
        ...page1.data.map((s) => s.id),
        ...page2.data.map((s) => s.id),
        ...page3.data.map((s) => s.id),
      ];
      expect(new Set(allIds).size).toBe(5);
    });
  });
});
