SET NOCOUNT ON;

DECLARE @FromDate datetime2 = '2026-02-01T00:00:00';
DECLARE @ToDate datetime2 = '2026-03-01T00:00:00';

-- Customers sample
SELECT TOP (20)
  c.cust_id,
  c.cust_code,
  c.cust_first_name,
  c.cust_contact_name,
  c.cust_clientname,
  c.cust_account_type,
  c.cust_email,
  c.cust_phone1,
  c.cust_phone2,
  c.cust_phone3,
  c.cust_noemail,
  c.cust_dont_email_newsletter
FROM dbo.tbl_Customers c
ORDER BY c.cust_id DESC;

-- Jobs sample
SELECT TOP (20)
  j.jobs_id,
  j.jobs_cust_id,
  j.jobs_quote_status,
  j.jobs_status,
  j.jobs_quote_number,
  j.jobs_inv_number,
  j.jobs_value,
  j.jobs_quoted_amount,
  j.jobs_quote_date,
  j.jobs_date_booked,
  j.jobs_date_requested,
  j.jobs_date_done
FROM dbo.tbl_Jobs j
ORDER BY j.jobs_id DESC;

-- Follow-up jobs (legacy inquiry-like table) sample
SELECT TOP (20)
  f.FUJ_ID,
  f.FUJ_Cust_id,
  f.FUJ_Date_Due,
  f.FUJ_type,
  f.FUJ_Customer_Status,
  f.FUJ_Comments,
  f.FUJ_Orig_Jobs_ID,
  f.FUJ_converted_to_Jobs_id
FROM dbo.tbl_FollowUpJobs f
ORDER BY f.FUJ_ID DESC;

-- February 2026 backfill candidates (created_at surrogate policy)
-- NOTE: legacy SQL does not expose a clean created_at on core business tables.
-- This query emits source_created_at using best available date columns.

-- Jobs
SELECT
  j.jobs_id,
  j.jobs_cust_id,
  COALESCE(
    CAST(j.jobs_prestart_createdate AS datetime2),
    CAST(j.jobs_accepted_date AS datetime2),
    CAST(j.Jobs_invoice_create_date AS datetime2),
    CAST(j.jobs_date_requested AS datetime2),
    CAST(j.jobs_date_booked AS datetime2)
  ) AS source_created_at,
  j.jobs_date_booked,
  j.jobs_date_requested,
  j.jobs_quote_date,
  j.jobs_status,
  j.jobs_quote_status,
  j.jobs_value
FROM dbo.tbl_Jobs j
WHERE COALESCE(
    CAST(j.jobs_prestart_createdate AS datetime2),
    CAST(j.jobs_accepted_date AS datetime2),
    CAST(j.Jobs_invoice_create_date AS datetime2),
    CAST(j.jobs_date_requested AS datetime2),
    CAST(j.jobs_date_booked AS datetime2)
  ) >= @FromDate
  AND COALESCE(
    CAST(j.jobs_prestart_createdate AS datetime2),
    CAST(j.jobs_accepted_date AS datetime2),
    CAST(j.Jobs_invoice_create_date AS datetime2),
    CAST(j.jobs_date_requested AS datetime2),
    CAST(j.jobs_date_booked AS datetime2)
  ) < @ToDate
ORDER BY source_created_at ASC, j.jobs_id ASC;

-- Inquiries (legacy follow-up jobs)
SELECT
  f.FUJ_ID,
  f.FUJ_Cust_id,
  CAST(f.FUJ_Date_Due AS datetime2) AS source_created_at,
  f.FUJ_type,
  f.FUJ_Customer_Status,
  f.FUJ_Comments,
  f.FUJ_Orig_Jobs_ID,
  f.FUJ_converted_to_Jobs_id
FROM dbo.tbl_FollowUpJobs f
WHERE CAST(f.FUJ_Date_Due AS datetime2) >= @FromDate
  AND CAST(f.FUJ_Date_Due AS datetime2) < @ToDate
ORDER BY source_created_at ASC, f.FUJ_ID ASC;
