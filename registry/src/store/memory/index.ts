import type { AllStores } from "../interfaces.js";
import { MemoryApiKeyStore } from "./api-key-store.js";
import { MemoryKnowledgeStore } from "./knowledge-store.js";
import { MemoryRateLimitStore } from "./rate-limit-store.js";
import { MemoryReputationStore } from "./reputation-store.js";
import { MemorySkillStore } from "./skill-store.js";

export function createMemoryStore(): AllStores {
  return {
    skills: new MemorySkillStore(),
    knowledge: new MemoryKnowledgeStore(),
    reputation: new MemoryReputationStore(),
    apiKeys: new MemoryApiKeyStore(),
    rateLimit: new MemoryRateLimitStore(),
  };
}

export { MemorySkillStore } from "./skill-store.js";
export { MemoryKnowledgeStore } from "./knowledge-store.js";
export { MemoryReputationStore } from "./reputation-store.js";
export { MemoryApiKeyStore } from "./api-key-store.js";
export { MemoryRateLimitStore } from "./rate-limit-store.js";
