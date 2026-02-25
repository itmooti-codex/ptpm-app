# Inquiry Detail Redesign Reference

This reference captures the field mapping and UI priorities used for the Inquiry Detail redesign.

## 1) Inquiry vs Job Field Matrix

| Field | Model | Purpose | Visibility Tier |
|---|---|---|---|
| `unique_id` | Inquiry | Primary record identity for calls and follow-up | Above fold |
| `deal_name` | Inquiry | Human-readable inquiry title | Above fold |
| `inquiry_status` | Inquiry | Current inquiry lifecycle state | Above fold |
| `sales_stage` | Inquiry | Sales funnel stage | Above fold |
| `created_at` / `date_added` | Inquiry | Intake timing context | Above fold |
| `type` | Inquiry | Inquiry type/category | Above fold |
| `how_did_you_hear` | Inquiry | Source attribution | Quick expand |
| `how_can_we_help` | Inquiry | Core request/problem summary | Above fold |
| `admin_notes` | Inquiry | Internal intake notes | Above fold |
| `service_provider_id` | Inquiry | Provider assignment at inquiry stage | Above fold |
| `primary_contact_id` | Inquiry | Main person linked to inquiry | Above fold |
| `company_id` | Inquiry | Business client linkage | Above fold |
| `property_id` | Inquiry | Location linkage | Above fold |
| `quote_record_id` | Inquiry | Link to created quote/job record | Above fold |
| `inquiry_for_job_id` | Inquiry | Secondary inquiry-to-job linkage | Quick expand |
| `inquiry_record_id` | Job | Link back to source inquiry | Above fold |
| `unique_id` | Job | Quote/job identifier used operationally | Above fold |
| `job_status` | Job | Fulfillment lifecycle state | Above fold (when job exists) |
| `quote_status` | Job | Quote lifecycle state | Above fold (when job exists) |
| `quote_date` | Job | Quote creation date | Above fold (when job exists) |
| `quote_total` | Job | Commercial value of quote | Quick expand |
| `follow_up_date` | Job | Next follow-up commitment | Above fold |
| `date_quote_sent` | Job | Sent timestamp for customer comms | Quick expand |
| `date_quoted_accepted` | Job | Acceptance milestone date | Quick expand |
| `job_total` | Job | Final job amount | Quick expand |
| `payment_status` | Job | Collection status | Quick expand |
| `invoice_number` / `invoice_total` | Job | Billing identity and amount | Deep detail |
| `admin_recommendation` | Job | Internal recommendation/notes | Above fold (notes preview) |
| `client_individual_id` | Job | Linked individual client | Above fold |
| `client_entity_id` | Job | Linked company client | Above fold |
| `accounts_contact_id` | Job | Billing contact | Quick expand |

## 2) Above-the-Fold Content Contract (1920x1080)

These must be visible without page-level vertical scrolling:

- Inquiry identity: `unique_id`, `deal_name`, `inquiry_status`, `sales_stage`.
- Customer/property summary: client name(s), phone, email, address/property.
- Action cluster: edit inquiry, quote/job actions, send/print paths.
- Notes preview: latest inquiry/job context from `admin_notes` / recommendation context.

## 3) Inquiry to Job Handoff (Non-Regression)

Current behavior in Inquiry Detail must remain unchanged:

1. Create Job from Inquiry with `inquiry_record_id` and quote defaults.
2. Update Inquiry after creation with:
   - `inquiry_status: "Quote Created"`
   - `quote_record_id: <created_job_id>`
   - `inquiry_for_job_id: <created_job_id>`

This is implemented in `src/js/inquiry-detail/queries.js` and `src/js/inquiry-detail/app.js`.

## 4) Legacy Critical Information Checklist

The old system screenshot was translated into these intent groups:

- Immediate actionability: status, assigned provider, create/update actions, follow-up status.
- Contacting coordination: key contact identity, primary phone/email, property address and access context.
- Scheduling certainty: required-by date, quote follow-up dates, accepted/sent markers.
- Quote/job readiness: quote state, linkage to created record, financial snapshot entry points.

## 5) Dashboard Visual Alignment Checklist

- Typography: Inter, consistent heading/body/label sizes and weights.
- Surfaces: same card shell behavior (`rounded`, border color, subtle shadow depth).
- Controls: reuse established button/input/dropdown styling language.
- Status badges: consistent shape, spacing, and color semantics for lifecycle states.
- Spacing rhythm: match Dashboard card/header padding and section gaps.

## 6) Reusable Lookup Pattern (From Property Contacts Modal)

Use the Property Contacts lookup as the reference interaction:

1. Debounced input search.
2. Loading, empty, and error states in the dropdown.
3. Select existing record from suggestions.
4. Fast fallback to create new record when no match.
5. Persist selected value back to form display and hidden IDs.

Do not change the backend behavior of this modal while reusing the pattern elsewhere.
