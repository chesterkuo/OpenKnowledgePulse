import type { KnowledgeUnit, ValidationVote, Visibility } from "@knowledgepulse/sdk";

// ── Pagination ─────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface PaginationOpts {
  offset?: number;
  limit?: number;
}

// ── Stored Types ───────────────────────────────────────

export interface StoredSkill {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags: string[];
  content: string; // raw SKILL.md
  visibility: Visibility;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface StoredKnowledgeUnit {
  id: string;
  unit: KnowledgeUnit;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface ReputationRecord {
  agent_id: string;
  score: number;
  contributions: number;
  validations: number;
  history: Array<{
    timestamp: string;
    delta: number;
    reason: string;
  }>;
  updated_at: string;
}

export interface ApiKeyRecord {
  key_hash: string;
  key_prefix: string; // first 8 chars for identification
  agent_id: string;
  scopes: Array<"read" | "write" | "admin">;
  tier: "free" | "pro" | "enterprise";
  created_at: string;
  revoked: boolean;
  revoked_at?: string;
}

// ── Store Interfaces ───────────────────────────────────

export interface SkillStore {
  create(skill: StoredSkill): Promise<StoredSkill>;
  getById(id: string): Promise<StoredSkill | undefined>;
  search(opts: {
    query?: string;
    domain?: string;
    tags?: string[];
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSkill>>;
  delete(id: string): Promise<boolean>;
}

export interface KnowledgeStore {
  create(entry: StoredKnowledgeUnit): Promise<StoredKnowledgeUnit>;
  getById(id: string): Promise<StoredKnowledgeUnit | undefined>;
  search(opts: {
    query?: string;
    types?: string[];
    domain?: string;
    min_quality?: number;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredKnowledgeUnit>>;
  delete(id: string): Promise<boolean>;
  getByAgentId(agentId: string): Promise<StoredKnowledgeUnit[]>;
}

export interface ReputationStore {
  get(agentId: string): Promise<ReputationRecord | undefined>;
  upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord>;
  getAll(): Promise<ReputationRecord[]>;
  getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>>;
  recordVote(vote: ValidationVote): Promise<void>;
  getVotes(): Promise<ValidationVote[]>;
  canVote(agentId: string): Promise<boolean>;
}

export interface ApiKeyStore {
  create(
    agentId: string,
    scopes: ApiKeyRecord["scopes"],
    tier: ApiKeyRecord["tier"],
  ): Promise<{ raw_key: string; record: ApiKeyRecord }>;
  verify(rawKey: string): Promise<ApiKeyRecord | undefined>;
  revoke(keyPrefix: string): Promise<boolean>;
  getByAgentId(agentId: string): Promise<ApiKeyRecord[]>;
}

export interface RateLimitStore {
  consume(
    identifier: string,
    tier: string,
    method: "GET" | "POST",
  ): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    reset: number; // Unix timestamp
    retryAfter?: number; // seconds
  }>;
  get429Count(identifier: string, windowMs: number): Promise<number>;
  record429(identifier: string): Promise<void>;
}

export interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  rateLimit: RateLimitStore;
}
