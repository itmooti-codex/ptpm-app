# Legacy SQL Introspection Report

This report summarizes read-only discovery run against:

- Server: `192.168.15.62`
- Database: `PTPM`
- Date: 2026-02-23

## How discovery is run

- Query pack: `scripts/sql/introspect.sql`
- Sample pack: `scripts/sql/sample-queries.sql`
- Example command:

```bash
sqlcmd -S "$LEGACY_SQL_SERVER" -U "$LEGACY_SQL_USER" -P "$LEGACY_SQL_PASSWORD" -d "$LEGACY_SQL_DATABASE" -i scripts/sql/introspect.sql
```

## Top business tables by row count

| Table | Rows |
|---|---:|
| `tbl_Jobs` | 157,684 |
| `tbl_Addresses` | 76,120 |
| `tbl_Customers` | 74,442 |
| `tbl_Client_Docs` | 57,950 |
| `tbl_Customers_Emails` | 8,408 |
| `tbl_ContractorEarnings` | 7,155 |
| `tbl_FollowUpJobs` | 1,388 |

## Key observations

- The legacy data model is centered around:
  - `tbl_Customers` (customer master)
  - `tbl_Jobs` (quotes/jobs/invoices workflow in one table)
  - `tbl_FollowUpJobs` (inquiry-like follow-up records)
  - `tbl_Client_Docs` (documents linked to jobs/customers)
- SQL foreign keys are sparse for business tables:
  - `jobs_cust_id -> tbl_Customers.cust_id` is **not declared FK**, but is a strong inferred relationship.
  - `FUJ_Cust_id -> tbl_Customers.cust_id` is **not declared FK**, inferred.
  - `job_svc_userId -> ref_Service_Personnel.serper_ID` is inferred.
- `tbl_Jobs` contains mixed quote/job/invoice concepts, requiring normalization into target `Deal` and `Job` semantics.

## Keys and inferred relationships

### Declared PKs (relevant)

- `tbl_Customers.cust_id`
- `tbl_Jobs.jobs_id`
- `tbl_FollowUpJobs.FUJ_ID`
- `tbl_Client_Docs.cdoc_id`
- `ref_Service_Personnel.serper_ID`

### Inferred joins (no FK constraint)

- `tbl_Jobs.jobs_cust_id = tbl_Customers.cust_id`
- `tbl_FollowUpJobs.FUJ_Cust_id = tbl_Customers.cust_id`
- `tbl_Client_Docs.cdoc_cust_id = tbl_Customers.cust_id`
- `tbl_Client_Docs.cdoc_job_id = tbl_Jobs.jobs_id`
- `tbl_Jobs.job_svc_userId = ref_Service_Personnel.serper_ID`

## Date/watermark profiling

Legacy business tables do not expose a single clean `created_at` field across all entities.

### `tbl_Jobs` February 2026 coverage by candidate date fields

| Field | Feb 2026 rows |
|---|---:|
| `jobs_prestart_createdate` | 0 |
| `jobs_accepted_date` | 0 |
| `Jobs_invoice_create_date` | 0 |
| `jobs_quote_send_office_date` | 0 |
| `jobs_invoice_send_office_date` | 0 |
| `jobs_date_requested` | 103 |
| `jobs_quote_date` | 142 |
| `jobs_date_done` | 222 |
| `jobs_inv_issue_date` | 286 |
| `jobs_date_booked` | 475 |

### `tbl_FollowUpJobs` February 2026

| Field | Feb 2026 rows |
|---|---:|
| `FUJ_Date_Due` | 37 |

## Recommended source-created surrogate policy

For one-time February 2026 backfill with the requested `created_at` window semantics:

- Jobs use:
  - `COALESCE(jobs_prestart_createdate, jobs_accepted_date, Jobs_invoice_create_date, jobs_date_requested, jobs_date_booked)` as `source_created_at`
- Inquiries use:
  - `FUJ_Date_Due` as `source_created_at`

This policy is implemented in:

- `scripts/sql/sample-queries.sql`
- `scripts/sync/mappings/jobs.json`
- `scripts/sync/mappings/inquiries.json`
