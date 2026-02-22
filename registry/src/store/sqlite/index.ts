import type { AllStores } from "../interfaces.js";
import { SqliteApiKeyStore } from "./api-key-store.js";
import { createDatabase } from "./db.js";
import { SqliteKnowledgeStore } from "./knowledge-store.js";
import { SqliteRateLimitStore } from "./rate-limit-store.js";
import { SqliteReputationStore } from "./reputation-store.js";
import { SqliteSkillStore } from "./skill-store.js";

/**
 * Create all stores backed by a single SQLite database.
 * @param dbPath - Path to the SQLite database file, or ":memory:" for in-memory.
 */
export function createSqliteStore(dbPath = ":memory:"): AllStores {
  const db = createDatabase(dbPath);

  return {
    skills: new SqliteSkillStore(db),
    knowledge: new SqliteKnowledgeStore(db),
    reputation: new SqliteReputationStore(db),
    apiKeys: new SqliteApiKeyStore(db),
    rateLimit: new SqliteRateLimitStore(db),
  };
}

export { createDatabase } from "./db.js";
export { SqliteSkillStore } from "./skill-store.js";
export { SqliteKnowledgeStore } from "./knowledge-store.js";
export { SqliteReputationStore } from "./reputation-store.js";
export { SqliteApiKeyStore } from "./api-key-store.js";
export { SqliteRateLimitStore } from "./rate-limit-store.js";
