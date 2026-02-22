import type { Database } from "bun:sqlite";
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

export class SqliteReputationStore implements ReputationStore {
  constructor(private db: Database) {}

  async get(agentId: string): Promise<ReputationRecord | undefined> {
    const row = this.db
      .query("SELECT * FROM reputation WHERE agent_id = $agent_id")
      .get({ $agent_id: agentId }) as Record<string, unknown> | null;
    if (!row) return undefined;
    return this.rowToRecord(row);
  }

  async upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord> {
    const now = new Date().toISOString();
    const existing = await this.get(agentId);

    if (existing) {
      existing.score = Math.max(0, existing.score + delta);
      existing.history.push({ timestamp: now, delta, reason });
      if (delta > 0) existing.contributions++;
      existing.updated_at = now;

      this.db
        .query(
          `UPDATE reputation SET score = $score, contributions = $contributions, validations = $validations, history = $history, updated_at = $updated_at
           WHERE agent_id = $agent_id`,
        )
        .run({
          $agent_id: agentId,
          $score: existing.score,
          $contributions: existing.contributions,
          $validations: existing.validations,
          $history: JSON.stringify(existing.history),
          $updated_at: existing.updated_at,
        });

      return existing;
    }

    const record: ReputationRecord = {
      agent_id: agentId,
      score: Math.max(0, delta),
      contributions: delta > 0 ? 1 : 0,
      validations: 0,
      history: [{ timestamp: now, delta, reason }],
      updated_at: now,
    };

    this.db
      .query(
        `INSERT INTO reputation (agent_id, score, contributions, validations, history, created_at, updated_at)
         VALUES ($agent_id, $score, $contributions, $validations, $history, $created_at, $updated_at)`,
      )
      .run({
        $agent_id: record.agent_id,
        $score: record.score,
        $contributions: record.contributions,
        $validations: record.validations,
        $history: JSON.stringify(record.history),
        $created_at: now,
        $updated_at: record.updated_at,
      });

    return record;
  }

  async getAll(): Promise<ReputationRecord[]> {
    const rows = this.db.query("SELECT * FROM reputation").all() as Record<string, unknown>[];
    return rows.map((row) => this.rowToRecord(row));
  }

  async getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>> {
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;

    // Get total count
    const countRow = this.db.query("SELECT COUNT(*) as count FROM reputation").get() as {
      count: number;
    };
    const total = countRow.count;

    // Get paginated, sorted results
    const rows = this.db
      .query("SELECT * FROM reputation ORDER BY score DESC LIMIT $limit OFFSET $offset")
      .all({ $limit: limit, $offset: offset }) as Record<string, unknown>[];

    const data = rows.map((row) => this.rowToRecord(row));

    return { data, total, offset, limit };
  }

  async recordVote(vote: ValidationVote): Promise<void> {
    this.db
      .query(
        `INSERT INTO validation_votes (validator_id, target_id, unit_id, valid, timestamp)
         VALUES ($validator_id, $target_id, $unit_id, $valid, $timestamp)`,
      )
      .run({
        $validator_id: vote.validatorId,
        $target_id: vote.targetId,
        $unit_id: vote.unitId,
        $valid: vote.valid ? 1 : 0,
        $timestamp: vote.timestamp,
      });
  }

  async getVotes(): Promise<ValidationVote[]> {
    const rows = this.db.query("SELECT * FROM validation_votes").all() as Record<string, unknown>[];
    return rows.map((row) => ({
      validatorId: row.validator_id as string,
      targetId: row.target_id as string,
      unitId: row.unit_id as string,
      valid: (row.valid as number) === 1,
      timestamp: row.timestamp as string,
    }));
  }

  async canVote(agentId: string): Promise<boolean> {
    const row = this.db
      .query("SELECT created_at FROM reputation WHERE agent_id = $agent_id")
      .get({ $agent_id: agentId }) as { created_at: string } | null;

    if (!row) return false;

    const createdAt = new Date(row.created_at).getTime();
    return Date.now() - createdAt >= THIRTY_DAYS_MS;
  }

  // ── Badge methods ───────────────────────────────────────

  async getBadges(agentId: string): Promise<DomainBadge[]> {
    const rows = this.db
      .query("SELECT * FROM badges WHERE agent_id = $agent_id")
      .all({ $agent_id: agentId }) as Record<string, unknown>[];
    return rows.map((row) => this.rowToBadge(row));
  }

  async grantBadge(badge: DomainBadge): Promise<void> {
    this.db
      .query(
        `INSERT OR REPLACE INTO badges (badge_id, agent_id, domain, level, granted_at, granted_by)
         VALUES ($badge_id, $agent_id, $domain, $level, $granted_at, $granted_by)`,
      )
      .run({
        $badge_id: badge.badge_id,
        $agent_id: badge.agent_id,
        $domain: badge.domain,
        $level: badge.level,
        $granted_at: badge.granted_at,
        $granted_by: badge.granted_by,
      });
  }

  async hasBadge(agentId: string, domain: string, level: BadgeLevel): Promise<boolean> {
    const row = this.db
      .query(
        "SELECT 1 FROM badges WHERE agent_id = $agent_id AND domain = $domain AND level = $level",
      )
      .get({ $agent_id: agentId, $domain: domain, $level: level });
    return row !== null;
  }

  // ── Certification proposal methods ──────────────────────

  async createProposal(proposal: CertificationProposal): Promise<CertificationProposal> {
    this.db
      .query(
        `INSERT INTO certification_proposals (proposal_id, agent_id, domain, target_level, proposed_by, status, created_at, closes_at)
         VALUES ($proposal_id, $agent_id, $domain, $target_level, $proposed_by, $status, $created_at, $closes_at)`,
      )
      .run({
        $proposal_id: proposal.proposal_id,
        $agent_id: proposal.agent_id,
        $domain: proposal.domain,
        $target_level: proposal.target_level,
        $proposed_by: proposal.proposed_by,
        $status: proposal.status,
        $created_at: proposal.created_at,
        $closes_at: proposal.closes_at,
      });

    // Insert initial votes if any
    for (const vote of proposal.votes) {
      this.db
        .query(
          `INSERT OR REPLACE INTO proposal_votes (proposal_id, voter_id, approve, weight)
           VALUES ($proposal_id, $voter_id, $approve, $weight)`,
        )
        .run({
          $proposal_id: proposal.proposal_id,
          $voter_id: vote.voter_id,
          $approve: vote.approve ? 1 : 0,
          $weight: vote.weight,
        });
    }

    return proposal;
  }

  async getProposal(proposalId: string): Promise<CertificationProposal | undefined> {
    const row = this.db
      .query("SELECT * FROM certification_proposals WHERE proposal_id = $proposal_id")
      .get({ $proposal_id: proposalId }) as Record<string, unknown> | null;
    if (!row) return undefined;

    const votes = this.db
      .query("SELECT * FROM proposal_votes WHERE proposal_id = $proposal_id")
      .all({ $proposal_id: proposalId }) as Record<string, unknown>[];

    return this.rowToProposal(row, votes);
  }

  async getOpenProposals(): Promise<CertificationProposal[]> {
    const rows = this.db
      .query("SELECT * FROM certification_proposals WHERE status = 'open'")
      .all() as Record<string, unknown>[];

    const proposals: CertificationProposal[] = [];
    for (const row of rows) {
      const votes = this.db
        .query("SELECT * FROM proposal_votes WHERE proposal_id = $proposal_id")
        .all({ $proposal_id: row.proposal_id as string }) as Record<string, unknown>[];
      proposals.push(this.rowToProposal(row, votes));
    }
    return proposals;
  }

  async addVoteToProposal(
    proposalId: string,
    vote: CertificationProposal["votes"][0],
  ): Promise<void> {
    this.db
      .query(
        `INSERT OR REPLACE INTO proposal_votes (proposal_id, voter_id, approve, weight)
         VALUES ($proposal_id, $voter_id, $approve, $weight)`,
      )
      .run({
        $proposal_id: proposalId,
        $voter_id: vote.voter_id,
        $approve: vote.approve ? 1 : 0,
        $weight: vote.weight,
      });
  }

  async updateProposalStatus(
    proposalId: string,
    status: CertificationProposal["status"],
  ): Promise<void> {
    this.db
      .query("UPDATE certification_proposals SET status = $status WHERE proposal_id = $proposal_id")
      .run({
        $proposal_id: proposalId,
        $status: status,
      });
  }

  // ── Private helpers ──────────────────────────────────────

  private rowToBadge(row: Record<string, unknown>): DomainBadge {
    return {
      badge_id: row.badge_id as string,
      agent_id: row.agent_id as string,
      domain: row.domain as string,
      level: row.level as BadgeLevel,
      granted_at: row.granted_at as string,
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
        approve: (v.approve as number) === 1,
        weight: v.weight as number,
      })),
      status: row.status as CertificationProposal["status"],
      created_at: row.created_at as string,
      closes_at: row.closes_at as string,
    };
  }

  private rowToRecord(row: Record<string, unknown>): ReputationRecord {
    return {
      agent_id: row.agent_id as string,
      score: row.score as number,
      contributions: row.contributions as number,
      validations: row.validations as number,
      history: JSON.parse(row.history as string),
      updated_at: row.updated_at as string,
    };
  }
}
