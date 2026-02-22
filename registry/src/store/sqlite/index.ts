import type { AllStores } from "../interfaces.js";
import { MemoryAuditLogStore } from "../memory/audit-log-store.js";
import { SqliteApiKeyStore } from "./api-key-store.js";
import { SqliteCreditStore } from "./credit-store.js";
import { createDatabase } from "./db.js";
import { SqliteKnowledgeStore } from "./knowledge-store.js";
import { SqliteMarketplaceStore } from "./marketplace-store.js";
import { SqliteProviderStore } from "./provider-store.js";
import { SqliteRateLimitStore } from "./rate-limit-store.js";
import { SqliteReputationStore } from "./reputation-store.js";
import { SqliteSecurityReportStore } from "./security-report-store.js";
import { SqliteSkillStore } from "./skill-store.js";
import { SqliteSopStore } from "./sop-store.js";
import { SqliteSubscriptionStore } from "./subscription-store.js";

/**
 * Create all stores backed by a single SQLite database.
 * Uses in-memory fallback for audit log (SQLite audit log deferred).
 *
 * @param dbPath - Path to the SQLite database file, or ":memory:" for in-memory.
 */
export function createSqliteStore(dbPath = ":memory:"): AllStores {
  const db = createDatabase(dbPath);

  return {
    skills: new SqliteSkillStore(db),
    knowledge: new SqliteKnowledgeStore(db),
    reputation: new SqliteReputationStore(db),
    apiKeys: new SqliteApiKeyStore(db),
    sop: new SqliteSopStore(db),
    rateLimit: new SqliteRateLimitStore(db),
    credits: new SqliteCreditStore(db),
    marketplace: new SqliteMarketplaceStore(db),
    // Memory fallback for audit log (SQLite implementation deferred)
    auditLog: new MemoryAuditLogStore(),
    providers: new SqliteProviderStore(db),
    securityReports: new SqliteSecurityReportStore(db),
    subscriptions: new SqliteSubscriptionStore(db),
  };
}

export { createDatabase } from "./db.js";
export { SqliteSkillStore } from "./skill-store.js";
export { SqliteKnowledgeStore } from "./knowledge-store.js";
export { SqliteReputationStore } from "./reputation-store.js";
export { SqliteApiKeyStore } from "./api-key-store.js";
export { SqliteRateLimitStore } from "./rate-limit-store.js";
export { SqliteSopStore } from "./sop-store.js";
export { SqliteCreditStore } from "./credit-store.js";
export { SqliteMarketplaceStore } from "./marketplace-store.js";
export { SqliteProviderStore } from "./provider-store.js";
export { SqliteSecurityReportStore } from "./security-report-store.js";
export { SqliteSubscriptionStore } from "./subscription-store.js";
