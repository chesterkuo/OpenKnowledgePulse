import { Database } from "bun:sqlite";

/**
 * Create and initialize a SQLite database with all required tables.
 * Enables WAL mode and foreign keys for performance and integrity.
 */
export function createDatabase(path = ":memory:"): Database {
  const db = new Database(path);

  // Enable WAL mode for better concurrent read performance
  db.run("PRAGMA journal_mode = WAL");
  // Enable foreign key constraints
  db.run("PRAGMA foreign_keys = ON");

  // ── Skills table ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT,
      author TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      content TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      quality_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ── Knowledge Units table ─────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_units (
      id TEXT PRIMARY KEY,
      unit_json TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ── Reputation table ──────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS reputation (
      agent_id TEXT PRIMARY KEY,
      score REAL NOT NULL DEFAULT 0,
      contributions INTEGER NOT NULL DEFAULT 0,
      validations INTEGER NOT NULL DEFAULT 0,
      history TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ── Validation Votes table ────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS validation_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      validator_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      valid INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  // ── API Keys table ────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      key_hash TEXT PRIMARY KEY,
      key_prefix TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT '[]',
      tier TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      revoked_at TEXT
    )
  `);

  // Index for prefix lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix)
  `);

  // Index for agent_id lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys (agent_id)
  `);

  // ── Rate Limit Buckets table ──────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      tokens REAL NOT NULL,
      last_refill INTEGER NOT NULL
    )
  `);

  // ── Rate Limit Violations table ───────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limit_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);

  // Index for violation lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_violations_identifier ON rate_limit_violations (identifier, timestamp)
  `);

  // ── SOPs table ──────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      sop_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      visibility TEXT NOT NULL DEFAULT 'network',
      approved_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ── SOP Versions table ─────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS sop_versions (
      sop_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      diff_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (sop_id, version)
    )
  `);

  return db;
}
