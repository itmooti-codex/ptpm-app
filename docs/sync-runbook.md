# Legacy SQL -> GraphQL Sync Runbook

This runbook covers operation of the one-way polling upsert sync.

## Scope

- Direction: **Legacy SQL Server -> VitalSync GraphQL**
- Mode: **One-way polling**
- Change types: **Upserts** (new + updated according to source cursor policy)
- Script: `scripts/sync/legacy-to-graphql-sync.js`

## Prerequisites

1. Configure `.env` from `.env.example`.
2. Confirm SQL read access:
   - `SELECT TOP 1 * FROM dbo.tbl_Customers`
3. Confirm GraphQL endpoint/API key.
4. Validate mapping files:
   - `scripts/sync/mappings/*.json`

## Commands

### 1) Dry-run (safe default)

```bash
npm run sync:legacy:dry-run
```

### 2) One-time February 2026 backfill (jobs + inquiries)

```bash
npm run sync:legacy:backfill-feb-2026
```

### 3) Incremental write mode (all mapped entities)

```bash
npm run sync:legacy:run
```

## Runtime outputs

- State cursor file:
  - `scripts/sync/.sync-state.json`
- Reconciliation reports:
  - `scripts/sync/reports/sync-report-*.json`
- Failed rows (dead-letter):
  - `scripts/sync/dead-letter/*.jsonl`

## Cursor/watermark behavior

- Cursor is tracked per entity.
- For datetime-watermark entities:
  - ordered by `watermark ASC, pk ASC`
  - batch cursor advances only when batch has no write failures
- For PK-watermark entities:
  - ordered by `pk ASC`
  - cursor is `lastPk`

## Replay procedure

1. Stop write runs.
2. Backup existing state file.
3. Edit `scripts/sync/.sync-state.json` for affected entity:
   - reduce `lastWatermark` and/or `lastPk`
4. Re-run in dry-run first, then write mode.

## Monitoring/alerts checklist

- Alert if `failedUpserts > 0` for N consecutive runs.
- Alert if `extracted` remains 0 unexpectedly during business hours.
- Alert if report generation fails or state file is not updated.
- Alert if dead-letter files grow above threshold.

## Production scheduling recommendation

- Start with every 5 minutes:
  - `*/5 * * * * cd /path/to/ptpm-app && npm run sync:legacy:run`
- Keep dry-run cron for validation in non-prod.
- Periodically run introspection (`scripts/sql/introspect.sql`) to detect schema drift.

## Safety notes

- Keep SQL and GraphQL credentials in environment variables/secrets only.
- Do not place secrets in mapping files, scripts, or docs.
- Always run dry-run after mapping changes before write mode.
