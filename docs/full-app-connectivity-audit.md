# Full App Connectivity Audit

Date: 2026-02-25

## Scope

- Core admin pages (dev + `html/admin` snippets)
- Service provider dev page (`dev/sp-dashboard.html`)
- Dev/test utility pages (`dev/api-test-contacts.html`, now archived)

## Page Inventory

### Dev pages

| Page | Purpose | Primary JS | Status |
|---|---|---|---|
| `dev/index.html` | Dev launcher | Inline | Active |
| `dev/dashboard.html` | Admin dashboard | `src/js/pages/dashboard.js` | Active |
| `dev/new-inquiry.html` | Create inquiry | `src/js/pages/new-inquiry.js` | Active |
| `dev/job-detail.html` | Job detail/edit flow | `src/js/pages/job-detail.js` | Active |
| `dev/notification.html` | Notifications | `src/js/pages/notification.js` | Active |
| `dev/customers-list.html` | Customer list | `src/js/pages/customers-list.js` | Active |
| `dev/customer-detail.html` | Customer detail/edit | `src/js/pages/customer-detail.js` | Active |
| `dev/company-detail.html` | Company detail/edit | `src/js/pages/company-detail.js` | Active |
| `dev/new-customer.html` | Create customer | `src/js/pages/new-customer.js` | Active |
| `dev/inquiry-detail.html` | Inquiry detail/edit (Alpine) | `src/js/inquiry-detail.js` | Active |
| `dev/sp-dashboard.html` | SP script test host | `src/js/sp/*.js` | Active (secondary) |
| `dev/api-test-contacts.html` | API probe utility | Inline + `src/js/vitalsync.js` | Soft archived to `archive/pages/dev/api-test-contacts.html` |

### Admin snippets

All core admin pages have matching `body-*` and `footer-*` files in `html/admin/` for:

- dashboard
- new inquiry
- job detail
- notifications
- customers list
- customer detail
- company detail
- new customer
- inquiry detail

## Canonical Route Map

| Source | Destination | Template |
|---|---|---|
| Dashboard row (inquiry/urgent calls) | Inquiry detail | `INQUIRY_DETAIL_URL_TEMPLATE` |
| Dashboard row (jobs/active jobs) | Job detail | `JOB_DETAIL_URL_TEMPLATE` |
| Dashboard row (quote) | Job detail | `QUOTE_DETAIL_URL_TEMPLATE` |
| Dashboard row (payment) | Job detail | `PAYMENT_DETAIL_URL_TEMPLATE` |
| Dashboard create button | New inquiry | `NEW_INQUIRY_URL` |
| Dashboard Customers button | Customers list | `CUSTOMERS_LIST_URL` |
| List/table client links | Customer detail | `CUSTOMER_DETAIL_URL_TEMPLATE` |
| List/table company links | Company detail | `COMPANY_DETAIL_URL_TEMPLATE` |
| Customers list CTA | New customer | `NEW_CUSTOMER_URL` |

## Known Gaps Found

1. `dev/dashboard.html` mock config was missing:
   - `CUSTOMER_DETAIL_URL_TEMPLATE`
   - `COMPANY_DETAIL_URL_TEMPLATE`
   - `NEW_CUSTOMER_URL`
2. Inquiry detail edit buttons existed but were not wired to:
   - `editInquiryDetails()`
   - `editAdminNotes()`
   - `editClientNotes()`
3. `src/js/pages/customer-detail.js` had fallback:
   - `job-detail.html?id={id}`
   - canonical should use `job-detail.html?job={id}`
4. Dashboard table view action had no user-facing message when URL templates are missing.

## Archive Candidate Set (Soft Archive)

Approved candidate for this pass:

- `dev/api-test-contacts.html` (dev utility, not needed for primary app workflows)

Archive method:

- Move to `archive/pages/dev/`
- Update `dev/index.html` to remove direct launcher card
- Add `archive/pages/README.md` with restore instructions and source mapping

## Verification Matrix

| Flow | Expected | Observed | Pass/Fail | Notes |
|---|---|---|---|---|
| Dashboard config includes customer/company/new-customer templates | Template keys exist in page config | Found all three keys in served `dev/dashboard.html` | Pass | Runtime fetch check |
| Dashboard -> Inquiry detail row navigation | Uses inquiry detail template | `getDetailUrlTemplateForTab('inquiry')` maps to `INQUIRY_DETAIL_URL_TEMPLATE` | Pass | Static code check |
| Dashboard -> Job detail row navigation | Uses job detail template | `getDetailUrlTemplateForTab('jobs')` maps to `JOB_DETAIL_URL_TEMPLATE` | Pass | Static code check |
| Dashboard -> Customers list button | Default + configured href works | `body-dashboard` fallback href present; JS sets from config | Pass | Static code check |
| Inquiry: Edit inquiry details button wiring | Button opens modal handler | `@click=\"editInquiryDetails()\"` in dev/admin pages | Pass | Static + served HTML check |
| Inquiry: Edit admin notes button wiring | Button opens modal handler | `@click=\"editAdminNotes()\"` in dev/admin pages | Pass | Static + served HTML check |
| Inquiry: Edit client notes button wiring | Button opens modal handler | `@click=\"editClientNotes()\"` in dev/admin pages | Pass | Static + served HTML check |
| Inquiry Property View Record | Button should navigate to property detail template | Wired `@click=\"navigateToProperty()\"` in dev/admin | Pass | Static check |
| Customer detail related job link fallback | Canonical `?job=` format | Updated to `job-detail.html?job={id}` | Pass | Static code check |
| Soft-archived API utility | Removed from active dev route and kept restorable | `dev/api-test-contacts.html` returns HTTP 404; archived copy + mapping created | Pass | Runtime + file checks |
| SP dev page smoke | Page remains available for SP script testing | `dev/sp-dashboard.html` unchanged and still referenced from dev index | Pass | Static check |
