# Legacy SQL to GraphQL Mapping

This document tracks field-level mapping between legacy SQL (`PTPM`) and the VitalSync GraphQL models in this app.

Primary schema references:

- `schema/schema-reference.json`
- `docs/inquiry-deal-quote-job-schema-brief.md`
- `scripts/sync/mappings/*.json`

## Entity mapping summary

| Legacy source | Target model | Status |
|---|---|---|
| `tbl_Customers` | `Contact` (`PeterpmContact`) | mapped (core fields) |
| `tbl_Customers` (business/gov/body corp subset) | `Company` (`PeterpmCompany`) | mapped (core fields) |
| `tbl_Jobs` | `Job` (`PeterpmJob`) | mapped (core fields, status/date normalization required) |
| `tbl_FollowUpJobs` | `Deal` (`PeterpmDeal`) | mapped (inquiry-like projection) |

## 1) Customers -> Contact

Source mapping file: `scripts/sync/mappings/customers.json`

| Legacy field | Target field | Transform | Notes |
|---|---|---|---|
| `cust_id` | `legacy_sql_customer_id` | identity | idempotency key |
| `cust_first_name` | `first_name` | trim, empty->null | |
| `cust_contact_name` | `last_name` | trim, empty->null | fallback for surname |
| `cust_email` | `email` | trim, empty->null | |
| `cust_phone1` | `sms_number` | trim, empty->null | |
| `cust_phone2` | `office_phone` | trim, empty->null | |
| `cust_account_type` | `account_type` | trim, empty->null | |
| `cust_suburb` | `city` | trim, empty->null | |
| `cust_street` | `address_1` | trim, empty->null | |
| `cust_notes` | `notes` | trim, empty->null | |
| `cust_noemail` | `no_email` | bit->bool | |
| `cust_dont_email_newsletter` | `dont_email_newsletter` | bit->bool | |

## 2) Customers (business subset) -> Company

Source mapping file: `scripts/sync/mappings/companies.json`

| Legacy field | Target field | Transform | Notes |
|---|---|---|---|
| `cust_id` | `legacy_sql_company_id` | identity | idempotency key |
| `cust_clientname` | `name` | trim, empty->null | |
| `cust_account_type` | `account_type` | trim, empty->null | |
| `cust_phone1` | `phone` | trim, empty->null | |
| `cust_email` | `email` | trim, empty->null | optional |
| `cust_street` | `address` | trim, empty->null | |
| `cust_suburb` | `city` | trim, empty->null | |
| `cust_notes` | `popup_comment` | trim, empty->null | |

## 3) Jobs -> Job

Source mapping file: `scripts/sync/mappings/jobs.json`

| Legacy field | Target field | Transform | Notes |
|---|---|---|---|
| `jobs_id` | `legacy_sql_job_id` | identity | idempotency key |
| `COALESCE(...)` | `created_at` | datetime->epoch seconds | source-created surrogate |
| `jobs_quote_number` | `quote_number` | trim, empty->null | |
| `jobs_inv_number` | `invoice_number` | trim, empty->null | |
| `jobs_quote_date` | `quote_date` | datetime->epoch seconds | |
| `jobs_date_booked` | `date_booked` | datetime->epoch seconds | |
| `jobs_date_requested` | `date_scheduled` | datetime->epoch seconds | proxy |
| `jobs_date_done` | `date_completed` | datetime->epoch seconds | |
| `jobs_status` | `legacy_job_status_code` | numeric | enum remap pending |
| `jobs_quote_status` | `legacy_quote_status_code` | numeric | enum remap pending |
| `jobs_value` | `job_total` | numeric | |
| `jobs_quoted_amount` | `quote_total` | numeric | |
| `jobs_comments` | `notes` | trim, empty->null | |
| `jobs_admin_comment` | `admin_notes` | trim, empty->null | |
| `jobs_svc_by` | `legacy_service_provider_name` | trim, empty->null | join to service provider pending |

## 4) FollowUpJobs -> Deal (Inquiry-like)

Source mapping file: `scripts/sync/mappings/inquiries.json`

| Legacy field | Target field | Transform | Notes |
|---|---|---|---|
| `FUJ_ID` | `legacy_sql_followup_id` | identity | idempotency key |
| `FUJ_Date_Due` | `created_at` | datetime->epoch seconds | source-created surrogate |
| `FUJ_type` | `type` | trim, empty->null | |
| `FUJ_Customer_Status` | `customer_status` | trim, empty->null | |
| `FUJ_Comments` | `how_can_we_help` | trim, empty->null | |
| `FUJ_StreetPrefix` | `street_prefix` | trim, empty->null | |
| `FUJ_Street` | `street` | trim, empty->null | |
| `FUJ_Suburb` | `suburb_town` | trim, empty->null | |
| `FUJ_Value` | `deal_value` | numeric | |
| `FUJ_Contact` | `contact_name` | trim, empty->null | |
| `FUJ_Orig_Jobs_ID` | `legacy_orig_job_id` | numeric | |
| `FUJ_converted_to_Jobs_id` | `legacy_converted_job_id` | numeric | |

## Outstanding mapping gaps

1. **Mutation contract validation**
   - Upsert mutation names/types in mapping files must be confirmed against the target GraphQL schema.
   - Current files use expected naming (`upsertPeterpm*`) and may require adjustment.

2. **Legacy relationship linking**
   - `jobs_cust_id` and `FUJ_Cust_id` should resolve to target Contact/Company IDs.
   - Requires lookup strategy (e.g., `legacy_sql_customer_id` index) before write mode.

3. **Status enum normalization**
   - `jobs_status`, `jobs_quote_status`, and follow-up status fields need explicit code->enum mapping.

4. **Created-at policy**
   - Legacy source lacks canonical created-at fields on core business tables.
   - Current surrogate policy is acceptable for migration/backfill but should be signed off.
