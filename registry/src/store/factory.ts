import type { AllStores } from "./interfaces.js";

/**
 * Create a store backend based on the KP_STORE_BACKEND environment variable.
 *
 * Supported backends:
 * - "memory" (default): In-memory stores, data lost on restart.
 * - "sqlite": SQLite-backed stores. Path controlled by KP_SQLITE_PATH (default: "knowledgepulse.db").
 */
export async function createStore(): Promise<AllStores> {
  const backend = process.env.KP_STORE_BACKEND ?? "memory";

  switch (backend) {
    case "sqlite": {
      const { createSqliteStore } = await import("./sqlite/index.js");
      const dbPath = process.env.KP_SQLITE_PATH ?? "knowledgepulse.db";
      return createSqliteStore(dbPath);
    }
    default: {
      const { createMemoryStore } = await import("./memory/index.js");
      return createMemoryStore();
    }
  }
}
