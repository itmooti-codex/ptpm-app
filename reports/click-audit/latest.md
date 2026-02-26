# UI Click Audit Report

- Generated: 2026-02-26T15:25:52.653Z
- Base URL: `http://127.0.0.1:5173/dev/`
- Max clicks per page: 80
- Pages audited: 12
- Clickables discovered: 149
- Clicks attempted: 149
- Clicks skipped (non-actionable): 54
- Click failures: 0
- Findings: high `11`, medium `7`, low `0`

## High-Severity Findings

| # | Location | Category | Issue | Reproduction |
|---|---|---|---|---|
| 1 | http://127.0.0.1:5173/dev/job-detail.html | page_load_exception | Page threw runtime exception on load: VS.waitForPlugin is not a function | Open http://127.0.0.1:5173/dev/job-detail.html and observe console/runtime errors on initial load. |
| 2 | http://127.0.0.1:5173/dev/notification.html | page_load_exception | Page threw runtime exception on load: window.VitalSync.init is not a function | Open http://127.0.0.1:5173/dev/notification.html and observe console/runtime errors on initial load. |
| 3 | http://127.0.0.1:5173/dev/notification.html | js_exception | Runtime exception after clicking "#notification-btn": window.VitalSync.init is not a function | Open http://127.0.0.1:5173/dev/notification.html, click "#notification-btn". |
| 4 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: Cannot read properties of null (reading 'addEventListener') | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 5 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: allJobs is not defined | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 6 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: Identifier 'toastTimer' has already been declared | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 7 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: waitingApprovalPayments is not defined | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 8 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: Identifier 'tabs' has already been declared | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 9 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: authorId is not defined | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 10 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: Cannot read properties of null (reading 'getAttribute') | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |
| 11 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_exception | Page threw runtime exception on load: REMOVE_STATUS_AFTER_OP_VALUE is not defined | Open http://127.0.0.1:5173/dev/sp-dashboard.html and observe console/runtime errors on initial load. |

## Medium-Severity Findings

| # | Location | Category | Issue | Reproduction |
|---|---|---|---|---|
| 1 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_console_error | Console error on initial load: Profile modal element not found | Open http://127.0.0.1:5173/dev/sp-dashboard.html and inspect browser console on initial load. |
| 2 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_console_error | Console error on initial load: Edit profile info modal element not found | Open http://127.0.0.1:5173/dev/sp-dashboard.html and inspect browser console on initial load. |
| 3 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_console_error | Console error on initial load: Error fetching currently provided services: ReferenceError: endpoint is not defined     at fetchCurrentlyProvidedServices (http://127.0.0.1:5173/src/js/sp/profile.js:344:36)     at initializeServices (http://127.0.0.1:5173/src/js/sp/profile.js:637:9)     at HTMLDocument.<anonymous> (http://127.0.0.1:5173/src/js/sp/profile.js:655:3) | Open http://127.0.0.1:5173/dev/sp-dashboard.html and inspect browser console on initial load. |
| 4 | http://127.0.0.1:5173/dev/sp-dashboard.html | page_load_warning | Warning on initial load: Error fetching all services: ReferenceError: endpoint is not defined     at fetchAllServices (http://127.0.0.1:5173/src/js/sp/profile.js:362:36)     at initializeServices (http://127.0.0.1:5173/src/js/sp/profile.js:638:9)     at HTMLDocument.<anonymous> (http://127.0.0.1:5173/src/js/sp/profile.js:655:3) | Open http://127.0.0.1:5173/dev/sp-dashboard.html and inspect browser warnings on initial load. |
| 5 | src/js/inquiry-detail/app.js:2539 | source_marker | this.notify("Edit billing flow coming soon."); | Inspect this code path and implement the missing behavior. |
| 6 | src/js/pages/dashboard.js:1838 | source_marker | console.log('Delete record:', delRow.getAttribute('data-unique-id'), '(not implemented)'); | Inspect this code path and implement the missing behavior. |
| 7 | src/js/pages/dashboard.js:2206 | source_marker | if (utils.showToast) utils.showToast('Batch action coming soon: ' + item.textContent.trim(), 'info'); | Inspect this code path and implement the missing behavior. |

## Low-Severity Findings

_No low-severity issues were detected in this run._

## Page Coverage Summary

| Page | Status | Clickables | Clicks Attempted | Clicks Skipped | Click Failures | Console Errors | JS Exceptions | Broken Links |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/dev/` | 200 | 11 | 11 | 0 | 0 | 22 | 17 | 0 |
| `/dev/company-detail.html?company=62` | 200 | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| `/dev/customer-detail.html?contact=20` | 200 | 16 | 16 | 0 | 0 | 15 | 0 | 0 |
| `/dev/customers-list.html` | 200 | 26 | 26 | 0 | 0 | 28 | 0 | 0 |
| `/dev/dashboard.html` | 200 | 38 | 38 | 32 | 0 | 8 | 1 | 0 |
| `/dev/index.html` | 200 | 11 | 11 | 0 | 0 | 22 | 17 | 0 |
| `/dev/inquiry-detail.html` | 200 | 1 | 1 | 0 | 0 | 2 | 0 | 0 |
| `/dev/job-detail.html` | 200 | 14 | 14 | 14 | 0 | 2 | 1 | 0 |
| `/dev/new-customer.html` | 200 | 4 | 4 | 0 | 0 | 10 | 0 | 0 |
| `/dev/new-inquiry.html` | 200 | 11 | 11 | 8 | 0 | 10 | 0 | 0 |
| `/dev/notification.html` | 200 | 7 | 7 | 0 | 0 | 4 | 3 | 0 |
| `/dev/sp-dashboard.html` | 200 | 0 | 0 | 0 | 0 | 4 | 14 | 0 |

## Source Markers (Potentially Incomplete Paths)

| # | File:Line | Marker |
|---|---|---|
| 1 | src/js/inquiry-detail/app.js:2539 | this.notify("Edit billing flow coming soon."); |
| 2 | src/js/pages/dashboard.js:1838 | console.log('Delete record:', delRow.getAttribute('data-unique-id'), '(not implemented)'); |
| 3 | src/js/pages/dashboard.js:2206 | if (utils.showToast) utils.showToast('Batch action coming soon: ' + item.textContent.trim(), 'info'); |
