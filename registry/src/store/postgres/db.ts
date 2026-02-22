import pg from "pg";

// ── Types ────────────────────────────────────────────────
export type PgPool = pg.Pool;

// ── Pool Factory ─────────────────────────────────────────

/**
 * Create a pg.Pool with sensible defaults for the registry workload.
 */
export function createPool(connectionString: string): PgPool {
  return new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// ── DDL Migrations ───────────────────────────────────────

const DDL = /* sql */ `
-- 1. skills
CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  version       TEXT,
  author        TEXT,
  tags          JSONB NOT NULL DEFAULT '[]',
  content       TEXT NOT NULL,
  visibility    TEXT NOT NULL DEFAULT 'private',
  quality_score REAL NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. knowledge_units
CREATE TABLE IF NOT EXISTS knowledge_units (
  id          TEXT PRIMARY KEY,
  unit_json   JSONB NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'private',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ku_type
  ON knowledge_units ((unit_json->>'@type'));
CREATE INDEX IF NOT EXISTS idx_ku_task_domain
  ON knowledge_units ((unit_json->'metadata'->>'task_domain'));
CREATE INDEX IF NOT EXISTS idx_ku_agent_id
  ON knowledge_units ((unit_json->'metadata'->>'agent_id'));

-- 3. reputation
CREATE TABLE IF NOT EXISTS reputation (
  agent_id      TEXT PRIMARY KEY,
  score         REAL NOT NULL DEFAULT 0,
  contributions INT NOT NULL DEFAULT 0,
  validations   INT NOT NULL DEFAULT 0,
  history       JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. validation_votes
CREATE TABLE IF NOT EXISTS validation_votes (
  id            SERIAL PRIMARY KEY,
  validator_id  TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  unit_id       TEXT NOT NULL,
  valid         BOOLEAN NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash    TEXT PRIMARY KEY,
  key_prefix  TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  scopes      JSONB NOT NULL DEFAULT '[]',
  tier        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked     BOOLEAN NOT NULL DEFAULT false,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
  ON api_keys (key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent
  ON api_keys (agent_id);

-- 6. rate_limit_buckets
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key  TEXT PRIMARY KEY,
  tokens      REAL NOT NULL,
  last_refill BIGINT NOT NULL
);

-- 7. rate_limit_violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id          SERIAL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  timestamp   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rlv_identifier_ts
  ON rate_limit_violations (identifier, timestamp);

-- 8. sops
CREATE TABLE IF NOT EXISTS sops (
  id                  TEXT PRIMARY KEY,
  sop_json            JSONB NOT NULL,
  version             INT NOT NULL DEFAULT 1,
  previous_version_id TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  visibility          TEXT NOT NULL DEFAULT 'private',
  approved_by         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. sop_versions
CREATE TABLE IF NOT EXISTS sop_versions (
  sop_id        TEXT NOT NULL,
  version       INT NOT NULL,
  diff_summary  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sop_id, version)
);

-- 10. credit_balances
CREATE TABLE IF NOT EXISTS credit_balances (
  agent_id    TEXT PRIMARY KEY,
  balance     REAL NOT NULL DEFAULT 0,
  last_refill TEXT
);

-- 11. credit_transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                  TEXT PRIMARY KEY,
  agent_id            TEXT NOT NULL,
  amount              REAL NOT NULL,
  type                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  related_listing_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_agent
  ON credit_transactions (agent_id);

-- 12. marketplace_listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id                TEXT PRIMARY KEY,
  knowledge_unit_id TEXT NOT NULL,
  contributor_id    TEXT NOT NULL,
  price_credits     REAL NOT NULL DEFAULT 0,
  access_model      TEXT NOT NULL DEFAULT 'free',
  domain            TEXT NOT NULL DEFAULT '',
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  purchases         INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_domain
  ON marketplace_listings (domain);
CREATE INDEX IF NOT EXISTS idx_ml_contributor
  ON marketplace_listings (contributor_id);

-- 13. badges
CREATE TABLE IF NOT EXISTS badges (
  badge_id    TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL,
  domain      TEXT NOT NULL,
  level       TEXT NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_badges_agent
  ON badges (agent_id);

-- 14. certification_proposals
CREATE TABLE IF NOT EXISTS certification_proposals (
  proposal_id   TEXT PRIMARY KEY,
  agent_id      TEXT NOT NULL,
  domain        TEXT NOT NULL,
  target_level  TEXT NOT NULL,
  proposed_by   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at     TIMESTAMPTZ NOT NULL
);

-- 15. proposal_votes
CREATE TABLE IF NOT EXISTS proposal_votes (
  proposal_id TEXT NOT NULL,
  voter_id    TEXT NOT NULL,
  approve     BOOLEAN NOT NULL,
  weight      REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (proposal_id, voter_id)
);

-- 16. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip            TEXT NOT NULL DEFAULT '',
  details       JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_agent
  ON audit_log (agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp
  ON audit_log (timestamp);

-- ── Full-Text Search ──────────────────────────────────

-- Skills: tsvector column + GIN index + trigger
ALTER TABLE skills ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_skills_search ON skills USING GIN(search_vector);

CREATE OR REPLACE FUNCTION skills_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skills_search_update ON skills;
CREATE TRIGGER skills_search_update
  BEFORE INSERT OR UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION skills_search_trigger();

-- Backfill existing rows
UPDATE skills SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

-- Knowledge Units: tsvector column + GIN index + trigger
ALTER TABLE knowledge_units ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_ku_search ON knowledge_units USING GIN(search_vector);

CREATE OR REPLACE FUNCTION ku_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.unit_json->>'@type', '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.unit_json->'metadata'->>'task_domain', '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.unit_json->'task'->>'objective', '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ku_search_update ON knowledge_units;
CREATE TRIGGER ku_search_update
  BEFORE INSERT OR UPDATE ON knowledge_units
  FOR EACH ROW EXECUTE FUNCTION ku_search_trigger();

-- Backfill existing rows
UPDATE knowledge_units SET search_vector =
  setweight(to_tsvector('english', COALESCE(unit_json->>'@type', '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(unit_json->'metadata'->>'task_domain', '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(unit_json->'task'->>'objective', '')), 'B')
WHERE search_vector IS NULL;
`;

/**
 * Run all DDL migrations (idempotent — uses IF NOT EXISTS throughout).
 */
export async function runMigrations(pool: PgPool): Promise<void> {
  await pool.query(DDL);
}
