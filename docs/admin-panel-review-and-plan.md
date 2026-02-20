# PTPM Admin Panel — Full Review & Development Plan

**Purpose:** Handover from previous dev team; you are managing the build. This doc is the critical analysis of the current state and a phased plan to keep what works, improve workflows, and support “develop in Cursor → deploy to GitHub Pages or copy into Ontraport” with minimal Ontraport reconfiguration.

**Business context:** Peter the Possum Man — 5 admin staff managing service jobs (inquiries → quotes → jobs → payments). Admins need to find customers, book jobs, assign service people, and manage jobs. Ontraport membership portal for login; Visitor = logged-in admin. Heavy use of Ontraport dynamic pages and VitalSync Dynamic Lists.

---

## 1. Current Architecture Summary

| Layer | What exists |
|-------|-------------|
| **Entry** | `dev/index.html` (dev hub), `dev/dashboard.html`, `dev/inquiry-detail.html`, `dev/job-detail.html`, `dev/new-inquiry.html`, `dev/notification.html`, `dev/sp-dashboard.html` |
| **Production HTML** | `html/admin/` (header, body-*, footer-*), `html/inquiry-detail/` (header, footer), `html/sp/`, `html/header.html`, `html/body.html`, `html/footer.html` |
| **Scripts** | `config.js` → `utils.js` → `vitalsync.js` → `domain.js` → `table.js` → page-specific (e.g. `pages/dashboard.js`, `pages/job-detail.js`, `pages/new-inquiry.js`). Inquiry detail: `bridge.js` → `data.js` → `queries.js` → `api.js` → `functions.js` → `app.js` → `extra.js` (Alpine.js + VitalSync Dynamic List). |
| **Data** | Domain layer in `domain.js` (inquiry, quote, job, payment, activeJob). Mappers normalize VitalSync field names to display keys. No `data/assignees.json` in repo (previous dev said it was meant for Ontraport admins as assignees). |
| **Deploy** | GitHub Actions deploys **`src`** to GitHub Pages. Ontraport pages use header/footer/body snippets that point at `https://itmooti-codex.github.io/ptpm-app/...` for JS/CSS. |

---

## 2. Critical Analysis — What’s Working

- **Dashboard**
  - Tabs (Inquiries, Quotes, Jobs, Payments, Active Jobs, Urgent Calls), filters sidebar, calendar strip, pagination, record count.
  - Data loading via VitalSync (domain layer, mappers, `fetchAndRenderCurrentTab()`).
  - Table renderer with status badges, client cells (with call/email/map icons), and action column (view / add / delete icons).
  - Notifications: bell + popover, subscription to announcements by `LOGGED_IN_USER_ID`.
  - Filter chips, “Apply” / “Reset”, date pickers (Flatpickr), mobile filter toggle.
- **Inquiry detail**
  - Single large Alpine.js app (`app.js` + `pageActions()`) with VitalSync Dynamic List; expects many URL/merge-field IDs: `INQUIRY_RECORD_ID`, `CONTACT_ID`, `COMPANY_ID`, `JOB_ID`, `PROPERTY_ID`, `JOB_UNIQUE_ID`, `ACCOUNT_TYPE`, `SERVICE_PROVIDER_ID`, `loggedInUserID`.
  - Bridge and config: `bridge.js` maps `AppConfig` to globals used by inquiry-detail scripts; works with Ontraport merge fields.
  - Static data: `data.js` (services catalog, email options) used by the page.
- **Job detail**
  - Multi-step form (Job Info → Activities → Materials → Uploads → Invoice), sidebar, modals; `job-detail.js` is a full controller.
- **New inquiry**
  - `new-inquiry.js` and body/footer snippets; can create/link contacts and companies; embeds inquiry-detail block and uses `#inquiry-detail [data-inquiry-id]`.
- **Service provider (SP) area**
  - `sp/` scripts (dashboard, inquiries, jobs, quotes, payments, appointments, materials, profile, etc.) and `html/sp/` body/footer.
- **Styling / stack**
  - Tailwind CDN, Inter font, brand `#003882`, shared `styles.css`, `inquiry-detail.css`. Dayjs + timezone, Flatpickr.

---

## 3. Critical Analysis — Gaps & Issues

### 3.1 Dashboard → Detail navigation (high)

- **View (eye) button:** In `dashboard.js` the view icon only does `console.log('View record:', uniqueId, 'tab:', state.activeTab)` and **does not navigate** to inquiry (or job/quote/payment) detail.
- **Row ID format:** Table rows use `data-unique-id` set from `row.id`; for inquiries the domain layer sets `id: '#' + item.id` (e.g. `#312`). So `uniqueId` is `"#312"`; for URLs you need the numeric id (e.g. `312`).
- **Implication:** In production, navigation to detail is likely done by Ontraport (e.g. link on the row or view icon to a dynamic page with merge fields). That’s fragile if the link or merge fields are wrong, and doesn’t work when developing purely off GitHub Pages (no Ontraport merge fields).

**Recommendation:** Implement navigation in code: add a configurable detail base URL (or use hash routing), derive numeric id from `data-unique-id` (strip `#`), and open inquiry detail (or job/quote/payment detail) based on `state.activeTab`. That way the same code works on Ontraport (with merge-field-driven detail pages) and on GitHub-hosted dev (e.g. `?inquiry=312` or similar).

### 3.2 Create button (high)

- **Create button** exists in `html/admin/body-dashboard.html` and `dev/dashboard.html` but there is **no click handler** in `dashboard.js` (or elsewhere). So “Create” does nothing in the current codebase.
- Likely intended to go to “New inquiry” or a generic create flow.

**Recommendation:** Either wire “Create” to a configurable URL (e.g. `AppConfig.NEW_INQUIRY_URL`) or to an in-app route (e.g. new inquiry form or modal). Prefer config so Ontraport can point to its own “new inquiry” dynamic page if needed.

### 3.3 Assignees for task assignment (medium)

- Previous dev: `data/assignees.json` was meant to hold **Ontraport admins** (not contacts) for assigning tasks. The file is **not present** in the repo.
- Inquiry detail uses assignees (e.g. `taskRowPopovers(task, assignees)` in `functions.js`; demo/hardcoded assignees in `app.js`).

**Recommendation:** Restore or add assignee source: e.g. `data/assignees.json` in repo (and optionally populated from an API or Ontraport admin list), or fetch from VitalSync if there is an “admin user” or “team member” model. Document where assignees come from so the 5 admins can be maintained in one place.

### 3.4 Inquiry detail URL variables (medium)

- Inquiry detail **expects many IDs** from the page context (merge fields or URL): `INQUIRY_RECORD_ID`, `CONTACT_ID`, `COMPANY_ID`, `JOB_ID`, `PROPERTY_ID`, `JOB_UNIQUE_ID`, `ACCOUNT_TYPE`, `SERVICE_PROVIDER_ID`, `loggedInUserID`.
- If the dashboard (or Ontraport) links to the detail page, that page must receive these (e.g. via Ontraport dynamic page merge fields or query params). The previous dev’s note (“page expects lot of url variables”) suggests the URL structure is critical.

**Recommendation:** Document the **exact** URL/merge-field contract (e.g. which query params or merge fields are required vs optional). Add a dev fallback in `bridge.js` (or dev HTML) that reads from `?inquiry=...&contact=...` etc. so the same detail page works when opened from GitHub-hosted dashboard with query params.

### 3.5 Duplicate IDs in table (medium)

- Action column uses **static** `id="view-icon"` and `id="add-icon"` per row. So every row has the same `#view-icon` in the DOM — invalid HTML and brittle for selectors (e.g. `closest('#view-icon')` still works, but `getElementById('view-icon')` would only find the first).
- `data-unique-id` on `<tr>` is correct; the issue is only the repeated `id` on icons.

**Recommendation:** Use classes or `data-action="view"` (and no `id`) for the action icons, and in the handler use `e.target.closest('tr[data-unique-id]')` plus the icon’s `data-action` (or a class). This keeps markup valid and avoids duplicate IDs.

### 3.6 “Inquiry details folder” and temp/modalsOnly (low / clarification)

- Previous dev: “Inquiry details folder … inquiry-detail-temp.html and modalsOnly.html are being used with the rest of the js files”; “ignore inquiry-detail.html”.
- In this repo there is **no** `inquiry-detail-temp.html` or `modalsOnly.html`. There is `dev/inquiry-detail.html` (full page) and `html/inquiry-detail/` (header + footer only). So either those two files live elsewhere (e.g. Ontraport-only) or were never committed.

**Recommendation:** Confirm with Dpes where `inquiry-detail-temp.html` and `modalsOnly.html` live and whether they need to be in this repo. If they’re the “body” content for the inquiry detail Ontraport page, consider adding them under `html/inquiry-detail/` (e.g. `body.html` and `body-modals.html`) so the whole flow is versioned and deployable from Cursor.

### 3.7 Visitor name in admin area (low)

- You asked for the logged-in admin’s name (e.g. top right). `AppConfig` has `CONTACT_ID` and `LOGGED_IN_USER_ID`; the dashboard doesn’t currently show the visitor’s name in the header.

**Recommendation:** Add a small “Logged in as [Name]” (or “Hi, [Name]”) in the admin header, using a merge field like `[Visitor//First Name]` / `[Visitor//Last Name]` in the header HTML (or fetch name by `LOGGED_IN_USER_ID` via VitalSync if you prefer everything in JS).

### 3.8 Deploy and “no changes in Ontraport” (medium)

- Today: Push to main → GitHub Actions deploys `src/` to GitHub Pages. Ontraport header/footer reference fixed URLs (e.g. `.../ptpm-app/js/config.js?v=1`). So **code** can be developed in Cursor and go live by push; **Ontraport** only needs a one-time paste of header/body/footer (and merge fields). After that, normal flow is “push code → Pages updates → Ontraport pages load new JS/CSS” without editing Ontraport.
- Caveat: If you add new scripts or new pages, you must paste new script tags or new body blocks into Ontraport once (or use a single “loader” script that pulls a manifest from GitHub). So “without having to update anything in Ontraport” holds for **existing** pages; new assets may require a one-time Ontraport update.

**Recommendation:** Document in `docs/deployment.md` that (1) JS/CSS are cached with `?v=1` and how to bump version for cache busting, and (2) new pages or new script tags need a one-time paste into Ontraport. Optionally add a small “version” or “manifest” endpoint (e.g. a JSON file in repo) so the loader can force-reload when version changes.

---

## 4. Development Phases

### Phase 1 — Stabilise and document (no breaking changes)

- **1.1** Document the “contract” for inquiry detail: required/optional URL params or merge fields, and example URL (e.g. from my.awesomate.pro when clicking the eye).
- **1.2** Add `AppConfig` options: e.g. `DETAIL_PAGE_BASE_URL` (or `INQUIRY_DETAIL_URL_TEMPLATE`), `NEW_INQUIRY_URL`, and document in `config.js` / `CLAUDE.md`.
- **1.3** Add visitor name to admin header (merge field or VitalSync) and note in body/header snippets.
- **1.4** (Optional) Add `data/assignees.json` with a stub structure and document that it’s for Ontraport admins; wire inquiry detail to read from it (or from a single source of truth) so the team can maintain the list.

**Outcome:** Clear contract for detail URLs and assignees; admin sees their name; config ready for Phase 2.

---

### Phase 2 — Dashboard navigation and Create (high value)

- **2.1** Fix action column: remove duplicate `id` on view/add/delete icons; use `data-action="view"` (and class) and update `dashboard.js` to use `closest('[data-action="view"]')` and `tr[data-unique-id]`.
- **2.2** Implement view navigation: in the view handler, parse numeric id from `data-unique-id` (strip `#`), then:
  - If `AppConfig.INQUIRY_DETAIL_URL_TEMPLATE` (or similar) is set: build URL (e.g. replace `{id}` with numeric id) and assign `window.location` or open in new tab.
  - Else if a local dev pattern is desired: same-window navigate to e.g. `inquiry-detail.html?inquiry=312` (or your chosen query param).
  - For other tabs (quote, job, payment, active job), use the same pattern with tab-specific URL config or a single template that includes the record type.
- **2.3** Implement Create button: if `AppConfig.NEW_INQUIRY_URL` is set, navigate there; else navigate to a local dev “new inquiry” page (or show a toast “Configure NEW_INQUIRY_URL”).
- **2.4** Ensure inquiry detail page can read `?inquiry=...` (and optionally other params) in dev and set `INQUIRY_RECORD_ID` (and others) from URL when merge fields are empty.

**Outcome:** Eye button and Create button work both on Ontraport (config-driven URLs) and in local/GitHub-hosted dev (query params / dev URLs).

---

### Phase 3 — Deploy and Ontraport alignment

- **3.1** Bump script/style version (e.g. `?v=2`) in all `html/` snippets after Phase 2 is verified, and document versioning in `docs/deployment.md`.
- **3.2** If `inquiry-detail-temp` / `modalsOnly` are confirmed: add them under `html/inquiry-detail/` (or document their Ontraport-only location) so the full flow is clear.
- **3.3** One-time: ensure Ontraport dashboard page has the correct merge fields and (if used) link/button URLs for “View” and “Create” so production matches the new behaviour.

**Outcome:** Production and dev behave consistently; deployment and versioning are documented.

---

### Phase 4 — Polish and optional improvements

- **4.1** Delete icon: either implement soft delete (e.g. call domain/VitalSync) or hide until spec’d; avoid leaving as console.log only.
- **4.2** Add button: define behaviour (e.g. “Add job for this inquiry”, “Add quote”) and implement or link to correct page.
- **4.3** Optional: “Logged in as” with VitalSync fetch by `LOGGED_IN_USER_ID` if you prefer not to rely on merge fields.
- **4.4** Optional: Central “manifest” or version file for cache busting and fewer Ontraport updates when adding assets.

**Outcome:** All table actions have defined behaviour; UX and maintainability improved.

---

## 5. Questions for Dpes (if needed)

1. **Detail URL:** When you click the eye on a row at https://my.awesomate.pro/admin/dashboard, what is the **exact** URL you get (including query params or path)? That will be the template we support in code.
2. **Assignees:** Where should the list of 5 admins (for task assignment) ultimately live: Ontraport, VitalSync, or a static `assignees.json` in this repo?
3. **inquiry-detail-temp.html / modalsOnly.html:** Are these only in Ontraport, or should they be added to this repo under `html/inquiry-detail/`?
4. **Create button:** Should “Create” always go to the same “New inquiry” page, or different targets per tab (e.g. “New inquiry” on Inquiries tab, “New quote” on Quotes tab)?

---

## 6. Files to Use / Ignore (recap from handover)

- **Use:** `pages/` (dashboard and other pages), `html/admin/`, `html/inquiry-detail/`, dashboard + inquiry-detail + job-detail + new-inquiry + notification flows. Domain, table, config, utils, vitalsync.
- **Ignore:** `z-new-version` and related files; `docs/` for *this* project’s product decisions (keep for reference; you said “ignore docs folder” — treat as “don’t block on them,” but `docs/deployment.md`, `docs/ontraport-app-workflow.md`, `docs/vitalsync-sdk-patterns.md` remain useful for build/deploy and patterns).
- **Inquiry detail:** Rely on `inquiry-detail-temp` + `modalsOnly` as the previous dev indicated; once their location is confirmed, align this repo (and Phase 3) accordingly.

---

## 7. Feature Parity Audit (Legacy ptpm vs ptpm-app)

*Source: Claude Code in VS Code — comparison of legacy codebase vs ptpm-app rewrite.*

### Size comparison

| | ptpm (legacy) | ptpm-app (rewrite) |
|---|----------------|---------------------|
| **Total JS lines** | ~44,500 | ~15,000 |
| **Architecture** | MVC (import/export) | IIFE modules + Alpine.js |
| **Dev server** | None | Vite (port 8000) |

### Feature-by-feature status

| Feature area | Legacy lines | App lines | Parity | Gaps |
|--------------|-------------|-----------|--------|------|
| Dashboard | 6,431 (3 files) | 801 (1 file) | 85% | Missing: Excel export, row-click navigation is stubbed |
| New Inquiry | 6,668 (4 files) | 1,576 (1 file) | 95% | Minor: address sync edge cases |
| Job Detail | 7,550 (3 files) | 1,451 (1 file) | 95% | Missing: Prestart/PCA forms, invoice PDF generation |
| Inquiry Detail | 7,518 (7 files) | 6,926 (7 files) | 90% | Good shape, modern Alpine.js architecture |
| Notifications | 415 (3 files) | 304 (1 file) | 100% | Complete |
| SP Portal | 9,764 (13 files) | 9,773 (14 files) | 75% | Biggest gap area (see below) |
| Helpers/Utils | 1,127 (1 file) | 710 (utils.js) + 329 (table.js) | 90% | Solid |

### Audit: critical gaps (priority order)

1. **Dashboard — Row click navigation (HIGH)**  
   Legacy: clicking a row navigates to inquiry detail with full params. App: stubbed with `console.log` — needs real routing.

2. **Dashboard — Excel export (MEDIUM)**  
   Legacy: SheetJS integration for Excel download. App: not implemented.

3. **Service Provider portal (HIGH — biggest gap)**

   | SP module | Status | What's missing |
   |-----------|--------|----------------|
   | payments.js | 75% | Xero sync logic incomplete, only status display |
   | materials.js | 70% | No create/update mutations hooked up |
   | status-actions.js | 60% | Only helpers, no real state transitions |
   | quotes.js | 75% | Quote creation flow incomplete |
   | appointments.js | 80% | Calendar view incomplete, booking validation missing |
   | sdk.js / bridge.js | 50% | Minimal config bridge |

4. **Job Detail — Missing features (MEDIUM)**  
   No Prestart/PCA form integration; invoice generation is display-only (no PDF creation); job sheet printing is a placeholder.

5. **Batch operations (LOW)**  
   Legacy dashboard has batch delete mode with multi-select; app doesn’t have this yet.

### What’s better in ptpm-app

- Vite dev server with hot reload
- VitalSync SDK wrapper (connection handling, cleaner API)
- Domain layer with Repository/Service/Mapper pattern
- Auto-generated JSDoc types from schema
- Comprehensive CLAUDE.md and docs
- Config bridge for Ontraport merge fields (vs hardcoded config)
- Much more maintainable code structure

---

## 8. Consolidated Priority to Get Live

Merged from this plan (Phases 1–4) and the feature parity audit:

| Priority | Item | Phase / area |
|----------|------|--------------|
| **P0** | Fix dashboard row navigation — wire click handlers to route to inquiry (and job/quote/payment) detail with full params | Phase 2 |
| **P0** | Fix action column (no duplicate `id`; use `data-action`) and implement Create button | Phase 2 |
| **P1** | Complete SP portal: payments (Xero sync) + materials (create/update mutations) — customer-facing | Phase 4+ / SP |
| **P1** | Add Excel export to dashboard | Phase 4 |
| **P2** | Wire SP status-actions with real mutations | Phase 4+ / SP |
| **P2** | Add Prestart/PCA links (or forms) to job detail | Phase 4 |
| **P2** | Inquiry detail URL contract + dev query-param fallback | Phase 1–2 |
| **P3** | Batch operations (multi-select, batch delete) | Phase 4 |
| **P3** | Invoice PDF generation, job sheet printing | Phase 4 |

---

## 9. Dev Workflow: See All Pages, Then Copy to Ontraport

- Run `npm run dev`; the app opens at `http://localhost:8000/dev/` (dev index).
- **Dev index** lists all admin pages: Dashboard, New Inquiry, Job Detail, Notifications, Inquiry Detail, SP Portal. Open any page directly.
- **Dashboard:** Use **View (eye)** on a row to open the right detail page with the record id (e.g. Inquiry Detail with `?inquiry=312`, Job Detail with `?job=123`). Use **Create** to open New Inquiry. URL templates are set in dev so navigation works without Ontraport.
- **Detail pages** read ids from the URL in dev: `inquiry-detail.html?inquiry=312`, `job-detail.html?job=123` (or `?quote=` / `?payment=`).
- **Dev banners** on each page link back to Dev home and Dashboard.
- **To go live:** Copy the matching snippets from `html/admin/` (header, body-*, footer-*) and `html/inquiry-detail/` into Ontraport (header/body/footer code). Set merge fields and, in production, set `INQUIRY_DETAIL_URL_TEMPLATE`, `JOB_DETAIL_URL_TEMPLATE`, `NEW_INQUIRY_URL` etc. to your Ontraport dynamic page URLs.

---

## 10. Next Step

Start with **Phase 1** (documentation and config + optional assignees + visitor name). Then implement **Phase 2** (view and Create navigation + action column fix + inquiry detail URL params in dev). The audit’s #1 item — dashboard row navigation — is the same as our Phase 2.1–2.2; implementing that next will unblock “click row → see detail” in both Ontraport and dev.
