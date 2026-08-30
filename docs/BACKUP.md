# CMG Case Dashboard — Backup & Restore

The CMG Case Management Dashboard stores data in two places:

| What | Where | Backed up by |
|------|-------|--------------|
| All case data, users, roles, teams, investigators, remarks, reviews, documents metadata, activity & audit logs | PostgreSQL database (`cmg_case_dashboard`) | `scripts/backup.sh` |
| The actual uploaded private documents | `./uploads/` directory (never inside `public/`) | `scripts/backup.sh` |

A valid backup therefore consists of **two** files produced in the same run:
a `.dump` (the database) and a `.tar.gz` (the uploaded documents).

---

## 1. Taking a backup

```bash
scripts/backup.sh
```

What it does:

1. Reads `DATABASE_URL` from `.env.local`.
2. Runs `pg_dump --format=custom --no-owner --no-privileges` → `backups/cmg_case_dashboard_<YYYYMMDD_HHMMSS>.dump`.
   Custom format is compressed and restorable with `pg_restore`.
3. Archives `./uploads/` → `backups/cmg_uploads_<YYYYMMDD_HHMMSS>.tar.gz` (skipped if empty).

**Existing backups are never deleted or overwritten.** Every run writes a
new, timestamped file. To store backups off-site, copy everything in
`backups/` to a safe location (e.g. nightly job + cloud storage).

Optional environment overrides:

```bash
BACKUP_DIR=/mnt/backups scripts/backup.sh      # custom backup location
UPLOAD_DIR=/var/lib/cmg-uploads scripts/backup.sh
```

## 2. Verifying a backup

```bash
scripts/verify-backup.sh backups/cmg_case_dashboard_<timestamp>.dump
```

- **Fast check:** validates the file is a readable `pg_dump` custom-format
  archive and lists the tables it contains.
- **Deep check (default):** restores the dump into a temporary scratch
  database, prints the row counts (`cases`, `reviews`, `documents`,
  `teams`, `investigators`, `users`), checks for orphaned foreign keys,
  then drops the scratch database. Pass `--fast` to skip the deep check.

The role in `DATABASE_URL` must have `CREATEDB` for the deep check.

## 3. Restoring a backup

```bash
scripts/restore.sh backups/cmg_case_dashboard_<timestamp>.dump
```

- Restores into the database in `DATABASE_URL` (must already exist).
- Uses `pg_restore --clean --if-exists` — **this replaces all schema and
  data in the target database**. The script asks you to type `restore` to
  confirm. Use `--yes` to skip the prompt, and `--into <url>` to restore
  into a different database.
- Restore the documents archive afterwards:

```bash
tar -xzf backups/cmg_uploads_<timestamp>.tar.gz   # restores ./uploads/
```

## 4. What is included in a backup

- All tables: `cases`, `remarks`, `reviews`, `activity_logs`,
  `case_documents`, `teams`, `investigators`, `users`, `import_batches`,
  `sessions`, `audit_logs`.
- Enum types and all indexes/constraints (including the unique
  `cmg_reference` constraint).
- The `uploads/` archive contains the physical evidence files.

Not included: the application source, `node_modules`, the `.next` build
directory, and secrets from `.env.local` (env files are gitignored and
must be managed separately).

## 5. Recommended schedule

- **Daily** automated `scripts/backup.sh` (e.g. cron) + copy `backups/` to
  a second location.
- **Weekly** restore-test: restore the latest dump into a scratch
  database (the verify script does this automatically) and confirm counts.
- Before **any major migration or upgrade**, take a manual backup first.