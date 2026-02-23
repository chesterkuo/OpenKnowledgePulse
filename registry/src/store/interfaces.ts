import type { ExpertSOP, KnowledgeUnit, ValidationVote, Visibility } from "@knowledgepulse/sdk";

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
  files?: Record<string, string>; // bundled files: relative_path → content
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

export interface StoredSOP {
  id: string;
  sop: ExpertSOP;
  version: number;
  previous_version_id?: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: Visibility;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SOPVersion {
  sop_id: string;
  version: number;
  diff_summary: string;
  created_at: string;
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

// ── Quarantine Status ─────────────────────────────────

export type QuarantineStatus = "flagged" | "quarantined" | "cleared" | null;

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
  setQuarantineStatus?(id: string, status: QuarantineStatus): Promise<void>;
  getQuarantineStatus?(id: string): Promise<QuarantineStatus>;
}

export interface ReputationStore {
  get(agentId: string): Promise<ReputationRecord | undefined>;
  upsert(agentId: string, delta: number, reason: string): Promise<ReputationRecord>;
  getAll(): Promise<ReputationRecord[]>;
  getLeaderboard(opts: PaginationOpts): Promise<PaginatedResult<ReputationRecord>>;
  recordVote(vote: ValidationVote): Promise<void>;
  getVotes(): Promise<ValidationVote[]>;
  canVote(agentId: string): Promise<boolean>;
  getBadges(agentId: string): Promise<DomainBadge[]>;
  grantBadge(badge: DomainBadge): Promise<void>;
  hasBadge(agentId: string, domain: string, level: BadgeLevel): Promise<boolean>;
  createProposal(proposal: CertificationProposal): Promise<CertificationProposal>;
  getProposal(proposalId: string): Promise<CertificationProposal | undefined>;
  getOpenProposals(): Promise<CertificationProposal[]>;
  addVoteToProposal(proposalId: string, vote: CertificationProposal["votes"][0]): Promise<void>;
  updateProposalStatus(proposalId: string, status: CertificationProposal["status"]): Promise<void>;
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

export interface SopStore {
  create(sop: StoredSOP): Promise<StoredSOP>;
  getById(id: string): Promise<StoredSOP | undefined>;
  search(opts: {
    query?: string;
    domain?: string;
    status?: StoredSOP["status"];
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<StoredSOP>>;
  update(id: string, updates: Partial<StoredSOP>): Promise<StoredSOP | undefined>;
  delete(id: string): Promise<boolean>;
  getVersions(id: string): Promise<SOPVersion[]>;
  addVersion(version: SOPVersion): Promise<void>;
  getByDomain(domain: string): Promise<StoredSOP[]>;
}

// ── Marketplace Types ─────────────────────────────────

export interface CreditTransaction {
  id: string;
  agent_id: string;
  amount: number;
  type: "purchase" | "earned" | "spent" | "payout" | "refill";
  description: string;
  related_listing_id?: string;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  knowledge_unit_id: string;
  contributor_id: string;
  price_credits: number;
  access_model: "free" | "org" | "subscription";
  domain: string;
  title: string;
  description: string;
  purchases: number;
  created_at: string;
  updated_at: string;
}

export interface CreditStore {
  getBalance(agentId: string): Promise<number>;
  addCredits(agentId: string, amount: number, reason: string): Promise<void>;
  deductCredits(agentId: string, amount: number, reason: string): Promise<boolean>;
  getTransactions(
    agentId: string,
    pagination: PaginationOpts,
  ): Promise<PaginatedResult<CreditTransaction>>;
  getLastRefill(agentId: string): Promise<string | undefined>;
  setLastRefill(agentId: string, date: string): Promise<void>;
}

export interface MarketplaceStore {
  createListing(listing: MarketplaceListing): Promise<MarketplaceListing>;
  getListing(id: string): Promise<MarketplaceListing | undefined>;
  search(opts: {
    domain?: string;
    access_model?: string;
    query?: string;
    pagination?: PaginationOpts;
  }): Promise<PaginatedResult<MarketplaceListing>>;
  recordPurchase(listingId: string, buyerId: string): Promise<void>;
  getByContributor(contributorId: string): Promise<MarketplaceListing[]>;
}

// ── Badge Types ───────────────────────────────────────

export type BadgeLevel = "bronze" | "silver" | "gold" | "authority";

export interface DomainBadge {
  badge_id: string;
  agent_id: string;
  domain: string;
  level: BadgeLevel;
  granted_at: string;
  granted_by: string; // "system" for auto, agent_id for admin/vote
}

export interface CertificationProposal {
  proposal_id: string;
  agent_id: string;
  domain: string;
  target_level: "gold" | "authority";
  proposed_by: string;
  votes: Array<{ voter_id: string; approve: boolean; weight: number }>;
  status: "open" | "approved" | "rejected";
  created_at: string;
  closes_at: string;
}

// ── Audit Logging ─────────────────────────────────────

export type AuditAction = "create" | "read" | "update" | "delete" | "export" | "validate";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  agentId: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ip: string;
  details?: Record<string, unknown>;
}

export interface AuditLogStore {
  log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void>;
  query(opts: {
    agentId?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
  }): Promise<AuditLogEntry[]>;
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

// ── Provider Discovery ───────────────────────────────

export interface ProviderRecord {
  id: string;
  url: string;
  name: string;
  status: "active" | "inactive" | "unknown";
  last_heartbeat: string | null;
  registered_at: string;
}

export interface ProviderStore {
  register(provider: Omit<ProviderRecord, "id" | "registered_at">): Promise<ProviderRecord>;
  getAll(): Promise<ProviderRecord[]>;
  getById(id: string): Promise<ProviderRecord | undefined>;
  updateHeartbeat(id: string): Promise<boolean>;
  updateStatus(id: string, status: ProviderRecord["status"]): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

// ── Security Reports ─────────────────────────────────

export interface SecurityReport {
  id: string;
  unit_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export interface SecurityReportStore {
  report(unitId: string, reporterId: string, reason: string): Promise<SecurityReport>;
  getReportsForUnit(unitId: string): Promise<SecurityReport[]>;
  getReportCount(unitId: string): Promise<number>;
  getAllReported(): Promise<Array<{ unit_id: string; count: number; status: QuarantineStatus }>>;
  resolve(unitId: string, verdict: "cleared" | "removed"): Promise<void>;
}

// ── Subscriptions ────────────────────────────────────

export interface SubscriptionRecord {
  id: string;
  agent_id: string;
  domain: string;
  credits_per_month: number;
  started_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
}

export interface SubscriptionStore {
  subscribe(agentId: string, domain: string, creditsPerMonth: number): Promise<SubscriptionRecord>;
  unsubscribe(id: string): Promise<boolean>;
  getActive(agentId: string): Promise<SubscriptionRecord[]>;
  hasAccess(agentId: string, domain: string): Promise<boolean>;
  getById(id: string): Promise<SubscriptionRecord | undefined>;
}

export interface AllStores {
  skills: SkillStore;
  knowledge: KnowledgeStore;
  reputation: ReputationStore;
  apiKeys: ApiKeyStore;
  sop: SopStore;
  credits: CreditStore;
  marketplace: MarketplaceStore;
  rateLimit: RateLimitStore;
  auditLog: AuditLogStore;
  providers: ProviderStore;
  securityReports: SecurityReportStore;
  subscriptions: SubscriptionStore;
}
