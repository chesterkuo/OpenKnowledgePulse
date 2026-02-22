import type { ValidationVote } from "@knowledgepulse/sdk";
import type { Database } from "bun:sqlite";
import type {
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
    const rows = this.db.query("SELECT * FROM validation_votes").all() as Record<
      string,
      unknown
    >[];
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
