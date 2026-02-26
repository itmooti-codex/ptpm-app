# Unified Design Audit Matrix

This matrix is the baseline for the "Unified Design Across All Pages" implementation.

## Scoring

- `Aligned` = already follows the target pattern
- `Partial` = close, but has notable deviations
- `Divergent` = uses a different pattern and needs intentional refactor

## Design Baseline

- Header shell: dark brand bar, title, predictable action cluster, optional back action
- Content shell: consistent page padding and section spacing
- Cards: shared radius/border/shadow and section-header treatment
- Forms: shared input/select/textarea sizing, borders, focus, label rhythm
- Tables: shared header cell style, row spacing, empty/loading/error state style
- Actions: consistent primary/secondary/ghost/danger button variants and labels
- Runtime parity: `dev/*` page structure mirrors `html/admin/body-*` + `footer-*` behavior

## Page Matrix

| Page | Header | Content Spacing | Cards | Forms | Tables | States (empty/loading/error) | Actions | Dev/Admin Parity | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `dev/dashboard.html` | Partial | Partial | Divergent | n/a | Partial | Partial | Partial | Partial | Uses unique dashboard shell and filter/table treatment |
| `dev/customers-list.html` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Similar to dashboard but different pagination/action density |
| `dev/customer-detail.html` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Close to target, needs standardized header/action layout |
| `dev/new-customer.html` | Partial | Partial | Partial | Partial | n/a | Partial | Partial | Partial | Form shell close to customer detail but button variants drift |
| `dev/new-inquiry.html` | Partial | Divergent | Partial | Partial | n/a | Partial | Partial | Partial | Three-column composition differs from other data-entry pages |
| `dev/job-detail.html` | Divergent | Divergent | Partial | Partial | Partial | Partial | Divergent | Partial | Step-flow header/actions differ significantly |
| `dev/inquiry-detail.html` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Alpine detail shell mostly reusable; state/action copy drifts |
| `dev/job-view.html` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Similar to inquiry detail with duplicate behavior logic |
| `dev/notification.html` | Divergent | Partial | Partial | n/a | Partial | Partial | Partial | Partial | Minimal header style differs from admin-core pages |
| `dev/company-detail.html` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Similar to customer detail; should share same composition |
| `dev/sp-dashboard.html` | Divergent | Divergent | Divergent | Partial | Partial | Partial | Divergent | n/a | Separate style system in `sp-styles.css` |

## Admin Snippet Matrix

| Snippet Family | Script Order | Versioning | Shared Dependencies | Inline Behavior | Status |
|---|---|---|---|---|---|
| `header.html` | Aligned | n/a | Aligned | n/a | Aligned |
| `footer-dashboard.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-customers-list.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-customer-detail.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-company-detail.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-new-customer.html` | Divergent | Divergent | Divergent | Partial | Divergent |
| `footer-new-inquiry.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-job-detail.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-inquiry-detail.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-job-view.html` | Partial | Divergent | Partial | Partial | Partial |
| `footer-notification.html` | Partial | Divergent | Partial | Partial | Partial |

## Shared CSS Matrix

| CSS File | Tokenization | Primitive Reuse | Hardcoded Values | Cross-Page Impact | Status |
|---|---|---|---|---|---|
| `src/css/styles.css` | Partial | Partial | Partial | High | Partial |
| `src/css/inquiry-detail.css` | Partial | Partial | Partial | Medium | Partial |
| `src/css/sp-styles.css` | Divergent | Divergent | Divergent | High (SP pages) | Divergent |

## Execution Order

1. Token + primitive foundation in `styles.css` (backward-compatible)
2. Admin core page shell convergence (`dashboard`, `customers-list`, `customer-detail`, `new-customer`, `new-inquiry`, `job-detail`)
3. Detail + notification + SP parity pass (`inquiry-detail`, `job-view`, `notification`, `sp-dashboard`)
4. JS behavior unification for states/actions/table conventions
5. Admin snippet parity and version normalization
