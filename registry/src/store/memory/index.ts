import type { AllStores } from "../interfaces.js";
import { MemoryApiKeyStore } from "./api-key-store.js";
import { MemoryAuditLogStore } from "./audit-log-store.js";
import { MemoryCreditStore } from "./credit-store.js";
import { MemoryKnowledgeStore } from "./knowledge-store.js";
import { MemoryMarketplaceStore } from "./marketplace-store.js";
import { MemoryProviderStore } from "./provider-store.js";
import { MemoryRateLimitStore } from "./rate-limit-store.js";
import { MemoryReputationStore } from "./reputation-store.js";
import { MemorySecurityReportStore } from "./security-report-store.js";
import { MemorySkillStore } from "./skill-store.js";
import { MemorySopStore } from "./sop-store.js";
import { MemorySubscriptionStore } from "./subscription-store.js";

export function createMemoryStore(): AllStores {
  return {
    skills: new MemorySkillStore(),
    knowledge: new MemoryKnowledgeStore(),
    reputation: new MemoryReputationStore(),
    apiKeys: new MemoryApiKeyStore(),
    sop: new MemorySopStore(),
    credits: new MemoryCreditStore(),
    marketplace: new MemoryMarketplaceStore(),
    rateLimit: new MemoryRateLimitStore(),
    auditLog: new MemoryAuditLogStore(),
    providers: new MemoryProviderStore(),
    securityReports: new MemorySecurityReportStore(),
    subscriptions: new MemorySubscriptionStore(),
  };
}

export { MemorySkillStore } from "./skill-store.js";
export { MemoryKnowledgeStore } from "./knowledge-store.js";
export { MemoryReputationStore } from "./reputation-store.js";
export { MemoryApiKeyStore } from "./api-key-store.js";
export { MemoryRateLimitStore } from "./rate-limit-store.js";
export { MemorySopStore } from "./sop-store.js";
export { MemoryCreditStore } from "./credit-store.js";
export { MemoryMarketplaceStore } from "./marketplace-store.js";
export { MemoryAuditLogStore } from "./audit-log-store.js";
export { MemoryProviderStore } from "./provider-store.js";
export { MemorySecurityReportStore } from "./security-report-store.js";
export { MemorySubscriptionStore } from "./subscription-store.js";
