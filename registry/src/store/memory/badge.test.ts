import { beforeEach, describe, expect, test } from "bun:test";
import type { CertificationProposal, DomainBadge } from "../interfaces.js";
import { MemoryReputationStore } from "./reputation-store.js";

describe("MemoryReputationStore — Badges & Proposals", () => {
  let store: MemoryReputationStore;

  beforeEach(() => {
    store = new MemoryReputationStore();
  });

  // ── Badge basics ──────────────────────────────────────

  test("getBadges returns empty array for new agent", async () => {
    const badges = await store.getBadges("unknown-agent");
    expect(badges).toEqual([]);
  });

  test("grantBadge adds badge, getBadges returns it", async () => {
    const badge: DomainBadge = {
      badge_id: "badge-1",
      agent_id: "agent-1",
      domain: "typescript",
      level: "bronze",
      granted_at: new Date().toISOString(),
      granted_by: "system",
    };

    await store.grantBadge(badge);
    const badges = await store.getBadges("agent-1");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual(badge);
  });

  test("hasBadge returns true for granted badge, false for ungranted", async () => {
    const badge: DomainBadge = {
      badge_id: "badge-1",
      agent_id: "agent-1",
      domain: "typescript",
      level: "bronze",
      granted_at: new Date().toISOString(),
      granted_by: "system",
    };

    await store.grantBadge(badge);

    expect(await store.hasBadge("agent-1", "typescript", "bronze")).toBe(true);
    expect(await store.hasBadge("agent-1", "typescript", "silver")).toBe(false);
    expect(await store.hasBadge("agent-1", "python", "bronze")).toBe(false);
    expect(await store.hasBadge("agent-2", "typescript", "bronze")).toBe(false);
  });

  // ── Auto-grant ────────────────────────────────────────

  test("auto-grants bronze badge after 10 contributions", async () => {
    // Make 10 contributions (each upsert with "Contributed" increments contributions)
    for (let i = 0; i < 10; i++) {
      await store.upsert("agent-1", 1, "Contributed knowledge");
    }

    const badges = await store.getBadges("agent-1");
    expect(badges).toHaveLength(1);
    expect(badges[0]!.level).toBe("bronze");
    expect(badges[0]!.granted_by).toBe("system");
    expect(badges[0]!.domain).toBe("general");
  });

  test("auto-grants silver badge after 50 contributions + 20 validations", async () => {
    // First accumulate 20 validations (these also give positive delta -> contributions)
    for (let i = 0; i < 20; i++) {
      await store.upsert("agent-1", 1, "Validated knowledge unit");
    }

    // Now we have 20 contributions + 20 validations.
    // Need 50 total contributions, so add 30 more via "Contributed"
    for (let i = 0; i < 30; i++) {
      await store.upsert("agent-1", 1, "Contributed knowledge");
    }

    const badges = await store.getBadges("agent-1");
    const levels = badges.map((b) => b.level);
    expect(levels).toContain("bronze");
    expect(levels).toContain("silver");
  });

  test("does not create duplicate auto-granted badges", async () => {
    // Make 10 contributions to trigger bronze
    for (let i = 0; i < 10; i++) {
      await store.upsert("agent-1", 1, "Contributed knowledge");
    }

    // Make 5 more contributions — should not add another bronze
    for (let i = 0; i < 5; i++) {
      await store.upsert("agent-1", 1, "Contributed knowledge");
    }

    const badges = await store.getBadges("agent-1");
    const bronzeBadges = badges.filter((b) => b.level === "bronze");
    expect(bronzeBadges).toHaveLength(1);
  });

  // ── Certification proposals ───────────────────────────

  test("createProposal + getProposal round-trips correctly", async () => {
    const proposal: CertificationProposal = {
      proposal_id: "prop-1",
      agent_id: "agent-1",
      domain: "typescript",
      target_level: "gold",
      proposed_by: "admin-1",
      votes: [],
      status: "open",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const created = await store.createProposal(proposal);
    expect(created).toEqual(proposal);

    const retrieved = await store.getProposal("prop-1");
    expect(retrieved).toEqual(proposal);
  });

  test("getOpenProposals filters by status", async () => {
    const openProposal: CertificationProposal = {
      proposal_id: "prop-open",
      agent_id: "agent-1",
      domain: "typescript",
      target_level: "gold",
      proposed_by: "admin-1",
      votes: [],
      status: "open",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const approvedProposal: CertificationProposal = {
      proposal_id: "prop-approved",
      agent_id: "agent-2",
      domain: "python",
      target_level: "authority",
      proposed_by: "admin-2",
      votes: [],
      status: "approved",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const rejectedProposal: CertificationProposal = {
      proposal_id: "prop-rejected",
      agent_id: "agent-3",
      domain: "rust",
      target_level: "gold",
      proposed_by: "admin-3",
      votes: [],
      status: "rejected",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await store.createProposal(openProposal);
    await store.createProposal(approvedProposal);
    await store.createProposal(rejectedProposal);

    const open = await store.getOpenProposals();
    expect(open).toHaveLength(1);
    expect(open[0]!.proposal_id).toBe("prop-open");
  });

  test("addVoteToProposal adds vote to proposal", async () => {
    const proposal: CertificationProposal = {
      proposal_id: "prop-1",
      agent_id: "agent-1",
      domain: "typescript",
      target_level: "gold",
      proposed_by: "admin-1",
      votes: [],
      status: "open",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await store.createProposal(proposal);
    await store.addVoteToProposal("prop-1", {
      voter_id: "voter-1",
      approve: true,
      weight: 1.5,
    });

    const updated = await store.getProposal("prop-1");
    expect(updated!.votes).toHaveLength(1);
    expect(updated!.votes[0]!.voter_id).toBe("voter-1");
    expect(updated!.votes[0]!.approve).toBe(true);
    expect(updated!.votes[0]!.weight).toBe(1.5);
  });

  test("updateProposalStatus changes status", async () => {
    const proposal: CertificationProposal = {
      proposal_id: "prop-1",
      agent_id: "agent-1",
      domain: "typescript",
      target_level: "gold",
      proposed_by: "admin-1",
      votes: [],
      status: "open",
      created_at: new Date().toISOString(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await store.createProposal(proposal);

    await store.updateProposalStatus("prop-1", "approved");
    const updated = await store.getProposal("prop-1");
    expect(updated!.status).toBe("approved");

    await store.updateProposalStatus("prop-1", "rejected");
    const updated2 = await store.getProposal("prop-1");
    expect(updated2!.status).toBe("rejected");
  });
});
