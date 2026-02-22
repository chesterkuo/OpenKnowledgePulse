import type { ValidationVote } from "@knowledgepulse/sdk";
import type {
  BadgeLevel,
  CertificationProposal,
  DomainBadge,
  PaginatedResult,
  PaginationOpts,
  ReputationRecord,
  ReputationStore,
} from "../interfaces.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class MemoryReputationStore implements ReputationStore {
  private records = new Map<string, ReputationRecord>();
  private createdAt = new Map<string, Date>();
  private votes: ValidationVote[] = [];
  private badges = new Map<string, DomainBadge[]>(); // agentId -> badges
  private proposals = new Map<string, CertificationProposal>(); // proposalId -> proposal

  async get(agentId: string): Promise<ReputationRecord | undefined> {
    return this.records.get(agentId);
  }

  async upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord> {
    const existing = this.records.get(agentId);
    const now = new Date().toISOString();

    if (existing) {
      existing.score = Math.max(0, existing.score + delta);
      existing.history.push({ timestamp: now, delta, reason });
      if (delta > 0) existing.contributions++;
      if (reason.includes("Validated")) existing.validations++;
      existing.updated_at = now;

      // Auto-grant badges on contribution
      if (reason.includes("Contributed") || reason.includes("Created")) {
        await this.evaluateBadges(agentId, "general");
      }

      return existing;
    }

    const record: ReputationRecord = {
      agent_id: agentId,
      score: Math.max(0, delta),
      contributions: delta > 0 ? 1 : 0,
      validations: reason.includes("Validated") ? 1 : 0,
      history: [{ timestamp: now, delta, reason }],
      updated_at: now,
    };
    this.records.set(agentId, record);
    this.createdAt.set(agentId, new Date());

    // Auto-grant badges on contribution (even for first record)
    if (reason.includes("Contributed") || reason.includes("Created")) {
      await this.evaluateBadges(agentId, "general");
    }

    return record;
  }

  async getAll(): Promise<ReputationRecord[]> {
    return Array.from(this.records.values());
  }

  async getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>> {
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;

    const sorted = Array.from(this.records.values()).sort((a, b) => b.score - a.score);
    const total = sorted.length;
    const data = sorted.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async recordVote(vote: ValidationVote): Promise<void> {
    this.votes.push(vote);
  }

  async getVotes(): Promise<ValidationVote[]> {
    return [...this.votes];
  }

  async canVote(agentId: string): Promise<boolean> {
    const created = this.createdAt.get(agentId);
    if (!created) return false;
    return Date.now() - created.getTime() >= THIRTY_DAYS_MS;
  }

  // ── Badge methods ───────────────────────────────────────

  async getBadges(agentId: string): Promise<DomainBadge[]> {
    return this.badges.get(agentId) ?? [];
  }

  async grantBadge(badge: DomainBadge): Promise<void> {
    const existing = this.badges.get(badge.agent_id) ?? [];
    existing.push(badge);
    this.badges.set(badge.agent_id, existing);
  }

  async hasBadge(agentId: string, domain: string, level: BadgeLevel): Promise<boolean> {
    const agentBadges = this.badges.get(agentId) ?? [];
    return agentBadges.some((b) => b.domain === domain && b.level === level);
  }

  // ── Certification proposal methods ──────────────────────

  async createProposal(proposal: CertificationProposal): Promise<CertificationProposal> {
    this.proposals.set(proposal.proposal_id, proposal);
    return proposal;
  }

  async getProposal(proposalId: string): Promise<CertificationProposal | undefined> {
    return this.proposals.get(proposalId);
  }

  async getOpenProposals(): Promise<CertificationProposal[]> {
    return Array.from(this.proposals.values()).filter((p) => p.status === "open");
  }

  async addVoteToProposal(
    proposalId: string,
    vote: CertificationProposal["votes"][0],
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;
    proposal.votes.push(vote);
  }

  async updateProposalStatus(
    proposalId: string,
    status: CertificationProposal["status"],
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;
    proposal.status = status;
  }

  // ── Auto-grant logic ───────────────────────────────────

  private async evaluateBadges(agentId: string, domain: string): Promise<void> {
    const record = this.records.get(agentId);
    if (!record) return;

    // Bronze: contributions >= 10 AND score > 0
    if (record.contributions >= 10 && record.score > 0) {
      if (!(await this.hasBadge(agentId, domain, "bronze"))) {
        await this.grantBadge({
          badge_id: `badge-${agentId}-${domain}-bronze`,
          agent_id: agentId,
          domain,
          level: "bronze",
          granted_at: new Date().toISOString(),
          granted_by: "system",
        });
      }
    }

    // Silver: contributions >= 50 AND validations >= 20
    if (record.contributions >= 50 && record.validations >= 20) {
      if (!(await this.hasBadge(agentId, domain, "silver"))) {
        await this.grantBadge({
          badge_id: `badge-${agentId}-${domain}-silver`,
          agent_id: agentId,
          domain,
          level: "silver",
          granted_at: new Date().toISOString(),
          granted_by: "system",
        });
      }
    }
  }

  /**
   * Backdoor for testing: override the created_at timestamp for an agent.
   * @internal
   */
  _setCreatedAt(agentId: string, date: Date): void {
    this.createdAt.set(agentId, date);
  }
}
