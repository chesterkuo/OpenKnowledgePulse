import type { MigrationFn } from "./types.js";

/**
 * Placeholder migration from v1 to v2.
 * Establishes the migration pattern for future schema evolution.
 */
export const migrateV1ToV2: MigrationFn = (input: unknown): unknown => {
  // When v2 schema changes are defined, transform fields here.
  // For now, pass through as-is.
  return input;
};
