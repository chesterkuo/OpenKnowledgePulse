import type { AllStores } from "../interfaces.js";
import { createPool, runMigrations } from "./db.js";
import { PgSkillStore } from "./skill-store.js";
import { PgKnowledgeStore } from "./knowledge-store.js";
import { PgReputationStore } from "./reputation-store.js";
import { PgApiKeyStore } from "./apikey-store.js";
import { PgSopStore } from "./sop-store.js";
import { PgCreditStore } from "./credit-store.js";
import { PgMarketplaceStore } from "./marketplace-store.js";
import { PgRateLimitStore } from "./rate-limit-store.js";
import { PgAuditLogStore } from "./audit-log-store.js";

export async function createPostgresStore(databaseUrl: string): Promise<AllStores> {
  const pool = createPool(databaseUrl);
  await runMigrations(pool);
  return {
    skills: new PgSkillStore(pool),
    knowledge: new PgKnowledgeStore(pool),
    reputation: new PgReputationStore(pool),
    apiKeys: new PgApiKeyStore(pool),
    sop: new PgSopStore(pool),
    credits: new PgCreditStore(pool),
    marketplace: new PgMarketplaceStore(pool),
    rateLimit: new PgRateLimitStore(pool),
    auditLog: new PgAuditLogStore(pool),
  };
}

// Re-export individual store classes for direct use
export { PgSkillStore } from "./skill-store.js";
export { PgKnowledgeStore } from "./knowledge-store.js";
export { PgReputationStore } from "./reputation-store.js";
export { PgApiKeyStore } from "./apikey-store.js";
export { PgSopStore } from "./sop-store.js";
export { PgCreditStore } from "./credit-store.js";
export { PgMarketplaceStore } from "./marketplace-store.js";
export { PgRateLimitStore } from "./rate-limit-store.js";
export { PgAuditLogStore } from "./audit-log-store.js";
export { createPool, runMigrations } from "./db.js";
