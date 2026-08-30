-- =============================================================
-- CMG Case Management Dashboard - Schema
-- PostgreSQL is the permanent source of truth.
-- =============================================================

-- ------------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'team_member', 'reporting', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM ('open', 'on_hold', 'pending', 'pending_review', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('not_started', 'in_progress', 'draft', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('none', 'pending_review', 'reviewed', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_status AS ENUM ('none', 'pending', 'in_progress', 'completed', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE remark_type AS ENUM ('note', 'update', 'follow_up', 'resolution', 'escalation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('prepared', 'imported', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------
-- TEAMS
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- INVESTIGATORS  (may or may not be an app user)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigators (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigators_team_id ON investigators(team_id);
CREATE INDEX IF NOT EXISTS idx_investigators_name ON investigators(name);

-- ------------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer',
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- ------------------------------------------------------------------
-- CASES
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cases (
  id                SERIAL PRIMARY KEY,
  cmg_reference     TEXT NOT NULL UNIQUE,          -- DB-level uniqueness
  client_reference  TEXT,
  title             TEXT,
  case_type         TEXT,

  target_name       TEXT,
  target_owner      TEXT,
  location          TEXT,
  city              TEXT,
  address           TEXT,
  contact_info      TEXT,

  brand             TEXT,
  client            TEXT,

  team_id           INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  investigator_id   INTEGER REFERENCES investigators(id) ON DELETE SET NULL,

  status            case_status NOT NULL DEFAULT 'open',
  report_status     report_status NOT NULL DEFAULT 'not_started',
  review_status     review_status NOT NULL DEFAULT 'none',
  enforcement_status enforcement_status NOT NULL DEFAULT 'none',

  case_opening_date DATE,
  investigation_date DATE,
  closing_date      DATE,
  enforcement_date  DATE,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  background        TEXT,
  findings          TEXT,
  remarks           TEXT,
  notes             TEXT,
  outcome           TEXT,

  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_cmg_reference ON cases(cmg_reference);
CREATE INDEX IF NOT EXISTS idx_cases_client_reference ON cases(client_reference);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_team_id ON cases(team_id);
CREATE INDEX IF NOT EXISTS idx_cases_investigator_id ON cases(investigator_id);
CREATE INDEX IF NOT EXISTS idx_cases_brand ON cases(brand);
CREATE INDEX IF NOT EXISTS idx_cases_target_name ON cases(target_name);
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_closing_date ON cases(closing_date);

-- ------------------------------------------------------------------
-- REMARKS  (append-only history)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remarks (
  id            SERIAL PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment       TEXT NOT NULL,
  type          remark_type NOT NULL DEFAULT 'note',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remarks_case_id ON remarks(case_id, created_at DESC);

-- ------------------------------------------------------------------
-- REVIEWS  (append-only history)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  reviewer_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_comment TEXT,
  review_status review_status NOT NULL DEFAULT 'reviewed',
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_case_id ON reviews(case_id, created_at DESC);

-- ------------------------------------------------------------------
-- ACTIVITY LOGS  (append-only timeline)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id            SERIAL PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_case_id ON activity_logs(case_id, created_at DESC);

-- ------------------------------------------------------------------
-- CASE DOCUMENTS
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_documents (
  id            SERIAL PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  file_type     TEXT,
  file_size     BIGINT,
  reference     TEXT,               -- external evidence reference
  file_path     TEXT,               -- where the physical file is stored
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);

-- ------------------------------------------------------------------
-- IMPORT BATCHES
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id            SERIAL PRIMARY KEY,
  filename      TEXT NOT NULL,
  status        import_status NOT NULL DEFAULT 'prepared',
  total_rows    INTEGER NOT NULL DEFAULT 0,
  new_count     INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB,
  errors        JSONB,               -- per-row validation results
  imported_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ============================================================
-- PHASE 9: AUTHENTICATION & RBAC (additive)
-- ============================================================

-- Required password change after first login (dev admin).
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Server-side session registry so logout truly invalidates a token.
CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id    TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Security / admin audit trail (never stores secrets).
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  description TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- PHASE 13: PORTAL STRUCTURE & FORM SIMPLIFICATION (additive)
-- Columns and enum values are never dropped; old values remain
-- valid for historical rows. Only additive changes are made.
-- ============================================================

-- Case status: operational states (Open / Close / Close 1).
DO $$ BEGIN
  ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'close';
  ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'close_1';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approval / reporting status (distinct from the operational status).
DO $$ BEGIN
  ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'pending_approval';
  ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'rejected';
  ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'approved';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Master reference lists used by the simplified case form.
CREATE TABLE IF NOT EXISTS target_by (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS target_natures (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS targets (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-many link between cases and brands.
CREATE TABLE IF NOT EXISTS case_brands (
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  brand_id      INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_case_brands_brand_id ON case_brands(brand_id);

-- Free-text target nature column (kept alongside the historical
-- target_natures master reference).
ALTER TABLE cases ADD COLUMN IF NOT EXISTS target_nature TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_target_nature ON cases(target_nature);

-- ============================================================
-- PHASE 17: BRANDS + TARGET NATURE MASTER LISTS (additive)
-- Populates the CMG Market Case master lists idempotently.
-- Custom Recordals, Target By and Investigators are untouched.
-- ============================================================

INSERT INTO brands (name) VALUES
  ('ZARA'),
  ('LEVI''S'),
  ('UNDER ARMOUR'),
  ('HUGO BOSS'),
  ('TORY BURCH'),
  ('US POLO ASSN.'),
  ('BEAUTY OF JOSEON'),
  ('TIRTIR'),
  ('COSRX'),
  ('NARS')
ON CONFLICT (name) DO NOTHING;

INSERT INTO target_natures (name) VALUES
  ('Garments'),
  ('Footwear'),
  ('Cosmetics'),
  ('Bags & Accessories')
ON CONFLICT (name) DO NOTHING;

-- New cases default to Open / Pending Approval.
ALTER TABLE cases ALTER COLUMN report_status SET DEFAULT 'pending_approval';

-- ============================================================
-- PHASE 15: RECORDALS (additive)
-- A case supports multiple recordal entries, each with only a
-- recordal date and the two brand reference numbers.
-- ============================================================

CREATE TABLE IF NOT EXISTS case_recordals (
  id                 SERIAL PRIMARY KEY,
  case_id            INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  recordal_date      DATE,
  brand_cmg_case_ref TEXT,
  brand_case_ref     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_recordals_case_id ON case_recordals(case_id);

-- Keep updated_at in sync on recordal edits.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_recordals_updated_at ON case_recordals;
CREATE TRIGGER trg_case_recordals_updated_at
  BEFORE UPDATE ON case_recordals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PHASE 16: CUSTOM RECORDALS (additive)
-- A completely independent module. Custom Recordals have NO
-- relationship to Market Cases (no FK to cases). Each entry holds
-- only: recordal date, client reference #, CMG reference #, brand.
-- ============================================================

CREATE TABLE IF NOT EXISTS custom_recordals (
  id                        SERIAL PRIMARY KEY,
  recordal_date             DATE,
  client_reference_number   TEXT NOT NULL,
  cmg_reference_number      TEXT NOT NULL,
  brand                     TEXT NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive migration for Recordal Date (safe to re-run).
ALTER TABLE custom_recordals ADD COLUMN IF NOT EXISTS recordal_date DATE;

CREATE INDEX IF NOT EXISTS idx_custom_recordals_client_reference_number ON custom_recordals(client_reference_number);
CREATE INDEX IF NOT EXISTS idx_custom_recordals_cmg_reference_number ON custom_recordals(cmg_reference_number);

DROP TRIGGER IF EXISTS trg_custom_recordals_updated_at ON custom_recordals;
CREATE TRIGGER trg_custom_recordals_updated_at
  BEFORE UPDATE ON custom_recordals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PHASE 18: UNILEVER CASES (additive)
-- A completely independent case-management module. Unilever
-- cases, brands and statuses live in their own tables and share
-- NOTHING with Market Cases, Custom Recordals or the global
-- investigators / target_by master data. This block is
-- non-destructive: no existing table or column is altered.
-- ============================================================

-- Separate Unilever brand master list. Never mixed with `brands`.
CREATE TABLE IF NOT EXISTS unilever_brands (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unilever_brands_name ON unilever_brands(name);

-- Independent Unilever case table. Status values mirror the portal's
-- operational/approval vocabulary but are stored as separate columns
-- with their own constraints (no FK to the Market Case enums/tables).
CREATE TABLE IF NOT EXISTS unilever_cases (
  id                SERIAL PRIMARY KEY,
  cmg_reference     TEXT NOT NULL UNIQUE,   -- unique WITHIN Unilever only
  client_reference  TEXT,
  target_name       TEXT,
  target_nature     TEXT,
  target_by         TEXT,                   -- restricted to the Unilever team
  brand             TEXT,                   -- denormalized first brand (search)
  brands            TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'close', 'close_1')),
  approval_status   TEXT NOT NULL DEFAULT 'pending_approval'
                    CHECK (approval_status IN ('pending_approval', 'rejected', 'approved')),
  investigation_date DATE,
  notes             TEXT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unilever_cases_cmg_reference ON unilever_cases(cmg_reference);
CREATE INDEX IF NOT EXISTS idx_unilever_cases_client_reference ON unilever_cases(client_reference);
CREATE INDEX IF NOT EXISTS idx_unilever_cases_status ON unilever_cases(status);
CREATE INDEX IF NOT EXISTS idx_unilever_cases_target_by ON unilever_cases(target_by);
CREATE INDEX IF NOT EXISTS idx_unilever_cases_target_nature ON unilever_cases(target_nature);
CREATE INDEX IF NOT EXISTS idx_unilever_cases_created_at ON unilever_cases(created_at DESC);

DROP TRIGGER IF EXISTS trg_unilever_cases_updated_at ON unilever_cases;
CREATE TRIGGER trg_unilever_cases_updated_at
  BEFORE UPDATE ON unilever_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Populate the Unilever brand master idempotently.
INSERT INTO unilever_brands (name) VALUES
  ('Dove'),
  ('Lifebuoy'),
  ('Sunsilk'),
  ('Lux'),
  ('Surf Excel'),
  ('Knorr'),
  ('Lipton'),
  ('Brooke Bond'),
  ('Rexona'),
  ('Vaseline'),
  ('Closeup'),
  ('Ponds'),
  ('Clear'),
  ('Domex'),
  ('Cif'),
  ('Pepsodent'),
  ('TRESemmé'),
  ('Hellmann''s'),
  ('Magnum'),
  ('Ben & Jerry''s'),
  ('Signal'),
  ('Axe'),
  ('Lakmé'),
  ('Fair & Lovely'),
  ('Rin'),
  ('Wheel'),
  ('Comfort'),
  ('Vim'),
  ('Cornetto'),
  ('Clinic Plus')
ON CONFLICT (name) DO NOTHING;
