import type { AllStores } from "../interfaces.js";
import { MemoryAuditLogStore } from "../memory/audit-log-store.js";
import { MemoryCreditStore } from "../memory/credit-store.js";
import { MemoryMarketplaceStore } from "../memory/marketplace-store.js";
import { SqliteApiKeyStore } from "./api-key-store.js";
import { createDatabase } from "./db.js";
import { SqliteKnowledgeStore } from "./knowledge-store.js";
import { SqliteRateLimitStore } from "./rate-limit-store.js";
import { SqliteReputationStore } from "./reputation-store.js";
import { SqliteSkillStore } from "./skill-store.js";
import { SqliteSopStore } from "./sop-store.js";

/**
 * Create all stores backed by a single SQLite database.
 * Uses in-memory fallbacks for stores not yet implemented in SQLite
 * (auditLog, credits, marketplace — planned for Task 17).
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
    // Memory fallbacks for stores not yet implemented in SQLite
    auditLog: new MemoryAuditLogStore(),
    credits: new MemoryCreditStore(),
    marketplace: new MemoryMarketplaceStore(),
  };
}

export { createDatabase } from "./db.js";
export { SqliteSkillStore } from "./skill-store.js";
export { SqliteKnowledgeStore } from "./knowledge-store.js";
export { SqliteReputationStore } from "./reputation-store.js";
export { SqliteApiKeyStore } from "./api-key-store.js";
export { SqliteRateLimitStore } from "./rate-limit-store.js";
export { SqliteSopStore } from "./sop-store.js";
