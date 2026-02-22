import type { AllStores } from "./interfaces.js";

/**
 * Create a store backend based on the KP_STORE_BACKEND environment variable.
 *
 * Supported backends:
 * - "memory" (default): In-memory stores, data lost on restart.
 * - "sqlite": SQLite-backed stores. Path controlled by KP_SQLITE_PATH (default: "knowledgepulse.db").
 * - "postgres": PostgreSQL-backed stores. Requires KP_DATABASE_URL.
 */
export async function createStore(): Promise<AllStores> {
  const backend = process.env.KP_STORE_BACKEND ?? "memory";

  switch (backend) {
    case "sqlite": {
      const { createSqliteStore } = await import("./sqlite/index.js");
      const dbPath = process.env.KP_SQLITE_PATH ?? "knowledgepulse.db";
      return createSqliteStore(dbPath);
    }
    case "postgres": {
      const { createPostgresStore } = await import("./postgres/index.js");
      const dbUrl = process.env.KP_DATABASE_URL;
      if (!dbUrl) throw new Error("KP_DATABASE_URL is required when KP_STORE_BACKEND=postgres");
      return createPostgresStore(dbUrl);
    }
    default: {
      const { createMemoryStore } = await import("./memory/index.js");
      return createMemoryStore();
    }
  }
}
