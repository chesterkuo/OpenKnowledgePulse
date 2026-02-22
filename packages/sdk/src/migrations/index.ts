import { MigrationRegistry } from "./types.js";
import { migrateV1ToV2 } from "./v1-to-v2.js";

const registry = new MigrationRegistry();

// Register known migrations
registry.register({ from: "v1", to: "v2", migrate: migrateV1ToV2 });

/**
 * Migrate a KnowledgeUnit from one schema version to another.
 * Automatically chains intermediate migrations.
 */
export function migrate(unit: unknown, fromVersion: string, toVersion: string): unknown {
  if (fromVersion === toVersion) return unit;

  const chain = registry.chain(fromVersion, toVersion);
  let result = unit;
  for (const fn of chain) {
    result = fn(result);
  }
  return result;
}

export { MigrationRegistry } from "./types.js";
export type { MigrationFn, MigrationEntry } from "./types.js";
