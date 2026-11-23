# CMG Case Management Dashboard

An internal case-management web application for tracking IP-infringement
cases, reports, reviews, enforcement, remarks, and documents — built with
Next.js (App Router), TypeScript, Tailwind CSS, and PostgreSQL.

> All sample data in the database is fictional.

---

## Requirements

- Node.js 20+ (project uses Next.js 16 / React 19)
- PostgreSQL 15+ (`pg_dump`/`pg_restore` for backups)
- On macOS via Homebrew: `brew install postgresql@17`

## 1. Start PostgreSQL

```bash
# macOS (Homebrew)
brew services start postgresql@17
export PATH="/usr/local/opt/postgresql@17/bin:$PATH"
psql -d postgres -c "CREATE ROLE cmg WITH LOGIN PASSWORD 'cmg_dev_password' CREATEDB;"
psql -d postgres -c "CREATE DATABASE cmg_case_dashboard OWNER cmg;"
```

(Adjust user/password to match `DATABASE_URL` in `.env.local`.)

## 2. Configure the environment

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string; use the hosted DB URL on Vercel |
| `DATABASE_SSL` | Set `true` for hosted Postgres that requires TLS |
| `AUTH_SECRET` | JWT/session signing secret — generate with `openssl rand -base64 48` |
| `DEV_ADMIN_PASSWORD` | (optional) bootstrap password applied by the dev script |
| `UPLOAD_DIR` | (optional) private documents directory; defaults to `./uploads` |
| `NEXT_PUBLIC_APP_URL` | Public app origin, e.g. `https://cmg-dashboard-delta.vercel.app` |
| `NEXT_PUBLIC_API_BASE_URL` | (optional) API origin; leave blank to use same-origin `/api` routes |

Secrets live only in `.env.local`, which is gitignored.

## 3. Install dependencies

```bash
npm install
```

## 4. Apply the database schema (migration)

```bash
node --env-file=.env.local src/lib/db/migrate.ts
```

`schema.sql` is idempotent (`CREATE TABLE IF NOT EXISTS`, additive
`ADD COLUMN IF NOT EXISTS`) and safe to re-run. It never drops or resets
data.

## 5. Development login setup

The `users` table starts empty after migration. Seed the fictional
sample dataset (dev only — **this script resets the tables**):

```bash
node --env-file=.env.local src/lib/db/seed.ts
```

Then bootstrap an admin password (change is required on first login):

```bash
node --env-file=.env.local src/lib/db/set-dev-password.ts admin@cmg.internal
```

Default seeded accounts (dev password `cmg-password-2026`):

| Role | Email |
|------|-------|
| Admin | `admin@cmg.internal` (password set by the script above) |
| Manager | `manager@cmg.internal` |
| Team Member | `sofia.ramirez@cmg.internal` |
| Reporting | `reporting@cmg.internal` |
| Viewer | `viewer@cmg.internal` |

## 6. Run the application

```bash
npm run dev        # development (http://localhost:3000)
npm run build      # production build
npm start          # production server
npm run lint       # ESLint
npx tsc --noEmit   # typecheck
```

## 7. Importing Excel data

1. Log in with a role that has the **Import** capability (Admin/Manager).
2. Go to **Import Data** and upload an `.xlsx` or `.csv` file.
3. Map the spreadsheet columns to case fields (auto-suggested).
4. Review the preview and any validation errors, then confirm.
5. Rows with duplicate CMG references are reported and skipped — they
   never overwrite existing cases.

## 8. User roles & permissions

Capabilities are enforced server-side on every API route:

| Capability | Admin | Manager | Team Member | Reporting | Viewer |
|------------|:-----:|:-------:|:-----------:|:---------:|:------:|
| View cases / dashboard / reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit cases | ✓ | ✓ | ✓ (own team) | — | — |
| Update reporting status | ✓ | ✓ | — | ✓ | — |
| Add remarks | ✓ | ✓ | ✓ | ✓ | — |
| Add reviews | ✓ | ✓ | — | — | — |
| Upload documents | ✓ | ✓ | ✓ | — | — |
| Delete documents | ✓ | ✓ | — | — | — |
| Import Excel/CSV | ✓ | ✓ | — | — | — |
| **Export reports** | ✓ | ✓ | — | ✓ | — |
| Manage teams/investigators | ✓ | ✓ | — | — | — |
| Manage users | ✓ | — | — | — | — |

## 9. Backup & restore

See [docs/BACKUP.md](docs/BACKUP.md). Quick start:

```bash
scripts/backup.sh                                # database + uploads
scripts/verify-backup.sh backups/cmg_case_dashboard_*.dump
scripts/restore.sh backups/cmg_case_dashboard_*.dump   # replaces target DB
```

Backups are written to `backups/` (gitignored) and never overwritten.

## Project layout

- `src/app/api/` — REST API routes (all capability-gated)
- `src/lib/services/` — database/business logic (PostgreSQL via `pg`)
- `src/lib/auth/` — sessions, passwords, audit logging
- `src/lib/storage/` — private document storage (path-traversal safe)
- `src/components/` — UI components
- `src/lib/db/schema.sql` — idempotent schema# CMG---Dashboard
