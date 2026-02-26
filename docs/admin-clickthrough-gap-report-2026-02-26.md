# Admin Click-Through Gap Report

Date: 2026-02-26  
Run artifact: `reports/click-audit/latest.md`  
Audit command: `npm run qa:click-audit`

## Scope

- Automated click-through across all `dev/*.html` pages
- Runtime checks for load-time JS exceptions, click-triggered exceptions, failed requests, and internal link health
- Static scan for explicit unfinished markers (`not implemented`, `coming soon`)

## Environment Notes

- This audit intentionally suppresses known noise for missing dev API key setup (`mock-data.local.js` / SDK key preconditions) so findings below focus on actual implementation gaps.
- Service Provider (`dev/sp-dashboard.html`) is a special dev harness and currently executes all SP scripts at once.

## Confirmed Gaps (Engineer Action List)

## P0 — Runtime Breakages

### 1) Notification page bootstraps with a non-existent VitalSync API
- **Repro:** Open `dev/notification.html`
- **Observed error:** `window.VitalSync.init is not a function`
- **Files:**
  - `dev/notification.html` (inline init call)
  - `html/admin/footer-notification.html` (same pattern in production snippet)
  - `src/js/vitalsync.js` (current public API = `connect/getPlugin/getStatus/onStatusChange`)
- **Why it breaks:** page calls `window.VitalSync.init(...)`, but wrapper does not expose `init`.
- **Build task:** migrate notification bootstrapping to wrapper API (`window.VitalSync.connect().then(...)`) and keep `window.PtpmNotification.init()` after successful connect.

### 2) Job Detail expects `VS.waitForPlugin()` which no longer exists
- **Repro:** Open `dev/job-detail.html`
- **Observed error:** `VS.waitForPlugin is not a function`
- **File:** `src/js/pages/job-detail.js:88`
- **Why it breaks:** `src/js/vitalsync.js` does not provide `waitForPlugin`.
- **Build task:** replace `VS.waitForPlugin()` usage with wrapper-compatible flow (e.g. `VS.connect()` then `VS.getPlugin()`), and normalize model access for all job-detail data loaders.

### 3) SP dev dashboard harness is not executable in current form
- **Repro:** Open `dev/sp-dashboard.html`
- **Observed load-time exceptions include:**
  - `allJobs is not defined`
  - `waitingApprovalPayments is not defined`
  - `authorId is not defined`
  - `REMOVE_STATUS_AFTER_OP_VALUE is not defined`
  - `Identifier 'toastTimer' has already been declared`
  - `Identifier 'tabs' has already been declared`
  - `Cannot read properties of null (reading 'addEventListener')`
- **Key source refs:**
  - `src/js/sp/dashboard.js:4`
  - `src/js/sp/payments.js:10`
  - `src/js/sp/basic.js:258` (+ modal event bindings)
  - `src/js/sp/inquiryDetails.js:1707`
  - multiple SP files define top-level `let toastTimer` and `const tabs`
- **Why it breaks:** all SP scripts run simultaneously on a placeholder page that does not provide required Ontraport merge globals or page-specific DOM roots.
- **Build task:** make SP scripts page-scoped and defensive (DOM guard clauses + namespacing), or split dev harness so each SP script runs only in its intended page context.

## P1 — Explicitly Unfinished Functionality

### 4) Inquiry Detail billing edit flow is intentionally incomplete
- **Source marker:** `src/js/inquiry-detail/app.js:2539`
- **Code:** `this.notify("Edit billing flow coming soon.");`
- **Build task:** implement billing edit interaction + persistence path.

### 5) Dashboard delete action is not implemented
- **Source marker:** `src/js/pages/dashboard.js:1838`
- **Code:** `console.log(... '(not implemented)')`
- **Build task:** implement real delete workflow (confirm, mutation, UI refresh, error handling).

### 6) Dashboard batch actions are placeholder only
- **Source marker:** `src/js/pages/dashboard.js:2206`
- **Code:** toast says `Batch action coming soon`
- **Build task:** implement batch action execution pipeline (selection → payload → execution → success/failure UI).

## Suggested Ticket Breakdown

1. **Fix notification bootstrapping API mismatch** (dev + `html/admin` snippet parity)
2. **Refactor job-detail model init to current VitalSync wrapper contract**
3. **Stabilize SP dev harness** (or split into page-specific harnesses) so runtime errors are actionable
4. **Implement Inquiry Detail billing edit flow**
5. **Implement Dashboard delete action**
6. **Implement Dashboard batch action execution**

