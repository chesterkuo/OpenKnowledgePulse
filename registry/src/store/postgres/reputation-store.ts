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
import type { PgPool } from "./db.js";

export class PgReputationStore implements ReputationStore {
  constructor(private pool: PgPool) {}

  async get(agentId: string): Promise<ReputationRecord | undefined> {
    const { rows } = await this.pool.query("SELECT * FROM reputation WHERE agent_id = $1", [
      agentId,
    ]);
    if (rows.length === 0) return undefined;
    return this.rowToRecord(rows[0]);
  }

  async upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord> {
    const now = new Date().toISOString();
    const historyEntry = JSON.stringify({ timestamp: now, delta, reason });
    const isValidation = reason.includes("Validated");
    const contributionInc = delta > 0 ? 1 : 0;
    const validationInc = isValidation ? 1 : 0;

    // Use upsert with JSONB array append
    await this.pool.query(
      `INSERT INTO reputation (agent_id, score, contributions, validations, history, created_at, updated_at)
       VALUES ($1, GREATEST(0, $2::real), $3, $4, $5::jsonb, $6, $6)
       ON CONFLICT (agent_id) DO UPDATE SET
         score = GREATEST(0, reputation.score + $2::real),
         contributions = reputation.contributions + $3,
         validations = reputation.validations + $4,
         history = reputation.history || $5::jsonb,
         updated_at = $6`,
      [agentId, delta, contributionInc, validationInc, `[${historyEntry}]`, now],
    );

    // Fetch and return the updated record
    const record = await this.get(agentId);
    return record!;
  }

  async getAll(): Promise<ReputationRecord[]> {
    const { rows } = await this.pool.query("SELECT * FROM reputation");
    return rows.map((row: Record<string, unknown>) => this.rowToRecord(row));
  }

  async getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>> {
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;

    const { rows: countRows } = await this.pool.query("SELECT COUNT(*) AS total FROM reputation");
    const total = Number.parseInt(countRows[0].total, 10);

    const { rows } = await this.pool.query(
      "SELECT * FROM reputation ORDER BY score DESC OFFSET $1 LIMIT $2",
      [offset, limit],
    );

    const data = rows.map((row: Record<string, unknown>) => this.rowToRecord(row));

    return { data, total, offset, limit };
  }

  async recordVote(vote: ValidationVote): Promise<void> {
    await this.pool.query(
      `INSERT INTO validation_votes (validator_id, target_id, unit_id, valid, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [vote.validatorId, vote.targetId, vote.unitId, vote.valid, vote.timestamp],
    );
  }

  async getVotes(): Promise<ValidationVote[]> {
    const { rows } = await this.pool.query("SELECT * FROM validation_votes ORDER BY id");
    return rows.map((row: Record<string, unknown>) => ({
      validatorId: row.validator_id as string,
      targetId: row.target_id as string,
      unitId: row.unit_id as string,
      valid: row.valid as boolean,
      timestamp:
        row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp as string),
    }));
  }

  async canVote(agentId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      "SELECT created_at FROM reputation WHERE agent_id = $1",
      [agentId],
    );
    if (rows.length === 0) return false;
    const createdAt =
      rows[0].created_at instanceof Date
        ? rows[0].created_at
        : new Date(rows[0].created_at as string);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - createdAt.getTime() >= thirtyDaysMs;
  }

  // ── Badge methods ───────────────────────────────────────

  async getBadges(agentId: string): Promise<DomainBadge[]> {
    const { rows } = await this.pool.query("SELECT * FROM badges WHERE agent_id = $1", [agentId]);
    return rows.map((row: Record<string, unknown>) => this.rowToBadge(row));
  }

  async grantBadge(badge: DomainBadge): Promise<void> {
    await this.pool.query(
      `INSERT INTO badges (badge_id, agent_id, domain, level, granted_at, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (badge_id) DO NOTHING`,
      [
        badge.badge_id,
        badge.agent_id,
        badge.domain,
        badge.level,
        badge.granted_at,
        badge.granted_by,
      ],
    );
  }

  async hasBadge(agentId: string, domain: string, level: BadgeLevel): Promise<boolean> {
    const { rows } = await this.pool.query(
      "SELECT 1 FROM badges WHERE agent_id = $1 AND domain = $2 AND level = $3",
      [agentId, domain, level],
    );
    return rows.length > 0;
  }

  // ── Certification proposal methods ──────────────────────

  async createProposal(proposal: CertificationProposal): Promise<CertificationProposal> {
    await this.pool.query(
      `INSERT INTO certification_proposals (proposal_id, agent_id, domain, target_level, proposed_by, status, created_at, closes_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        proposal.proposal_id,
        proposal.agent_id,
        proposal.domain,
        proposal.target_level,
        proposal.proposed_by,
        proposal.status,
        proposal.created_at,
        proposal.closes_at,
      ],
    );

    // Insert initial votes if any
    for (const vote of proposal.votes) {
      await this.pool.query(
        `INSERT INTO proposal_votes (proposal_id, voter_id, approve, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (proposal_id, voter_id) DO NOTHING`,
        [proposal.proposal_id, vote.voter_id, vote.approve, vote.weight],
      );
    }

    return proposal;
  }

  async getProposal(proposalId: string): Promise<CertificationProposal | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM certification_proposals WHERE proposal_id = $1",
      [proposalId],
    );
    if (rows.length === 0) return undefined;

    const row = rows[0];
    const { rows: voteRows } = await this.pool.query(
      "SELECT * FROM proposal_votes WHERE proposal_id = $1",
      [proposalId],
    );

    return this.rowToProposal(row, voteRows);
  }

  async getOpenProposals(): Promise<CertificationProposal[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM certification_proposals WHERE status = 'open'",
    );

    const proposals: CertificationProposal[] = [];
    for (const row of rows) {
      const { rows: voteRows } = await this.pool.query(
        "SELECT * FROM proposal_votes WHERE proposal_id = $1",
        [row.proposal_id],
      );
      proposals.push(this.rowToProposal(row, voteRows));
    }

    return proposals;
  }

  async addVoteToProposal(
    proposalId: string,
    vote: CertificationProposal["votes"][0],
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO proposal_votes (proposal_id, voter_id, approve, weight)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (proposal_id, voter_id) DO UPDATE SET
         approve = EXCLUDED.approve,
         weight = EXCLUDED.weight`,
      [proposalId, vote.voter_id, vote.approve, vote.weight],
    );
  }

  async updateProposalStatus(
    proposalId: string,
    status: CertificationProposal["status"],
  ): Promise<void> {
    await this.pool.query("UPDATE certification_proposals SET status = $1 WHERE proposal_id = $2", [
      status,
      proposalId,
    ]);
  }

  // ── Row mappers ─────────────────────────────────────────

  private rowToRecord(row: Record<string, unknown>): ReputationRecord {
    let history: ReputationRecord["history"];
    if (typeof row.history === "string") {
      history = JSON.parse(row.history);
    } else if (Array.isArray(row.history)) {
      history = row.history as ReputationRecord["history"];
    } else {
      history = [];
    }

    return {
      agent_id: row.agent_id as string,
      score: row.score as number,
      contributions: row.contributions as number,
      validations: row.validations as number,
      history,
      updated_at:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at as string),
    };
  }

  private rowToBadge(row: Record<string, unknown>): DomainBadge {
    return {
      badge_id: row.badge_id as string,
      agent_id: row.agent_id as string,
      domain: row.domain as string,
      level: row.level as BadgeLevel,
      granted_at:
        row.granted_at instanceof Date ? row.granted_at.toISOString() : (row.granted_at as string),
      granted_by: row.granted_by as string,
    };
  }

  private rowToProposal(
    row: Record<string, unknown>,
    voteRows: Record<string, unknown>[],
  ): CertificationProposal {
    return {
      proposal_id: row.proposal_id as string,
      agent_id: row.agent_id as string,
      domain: row.domain as string,
      target_level: row.target_level as CertificationProposal["target_level"],
      proposed_by: row.proposed_by as string,
      votes: voteRows.map((v) => ({
        voter_id: v.voter_id as string,
        approve: v.approve as boolean,
        weight: v.weight as number,
      })),
      status: row.status as CertificationProposal["status"],
      created_at:
        row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string),
      closes_at:
        row.closes_at instanceof Date ? row.closes_at.toISOString() : (row.closes_at as string),
    };
  }
}
