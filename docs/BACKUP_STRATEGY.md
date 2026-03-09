# Backup strategy

## Database (Supabase/Postgres)

- **Automated:** Use Supabase Dashboard backups (daily; retention per plan) or your provider's PITR.
- **Retention:** Recommend 7–30 days for production; adjust per compliance.
- **Manual dump:** `pg_dump` from Supabase connection string (store in secrets):
  - `pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql`

## Restore procedure

1. Create a new Supabase project or use a staging DB.
2. Restore: `psql "postgresql://..." < backup_YYYYMMDD.sql`
3. Point app to restored DB via `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
4. Verify with health `/ready` and smoke tests.

## Application state

- No backup of in-memory state required if DB and env are backed up.
- Redis: if used, enable RDB/AOF per Redis docs; backup Redis data dir if persistence is enabled.
