# ptpm-app — Peter the Possum Man Ontraport App

## Project Details
- **Client:** Peter the Possum Man (slug: `peterpm`)
- **Type:** Ontraport App (vanilla JS, no build step)
- **GitHub Pages:** https://itmooti-codex.github.io/ptpm-app
- **VitalSync SDK:** Loaded via CDN in header code
- **Script Load Order:** config.js → utils.js → models.js → vitalsync.js → app.js

## Product Context (Admin Core Priority)
- **Purpose:** Build a fast custom admin interface so staff can quickly find clients, call them, add notes, and assign/manage jobs without relying on slow Ontraport UI flows.
- **System of record:** Ontraport is the CRM; VitalStats syncs with Ontraport in both directions. App reads/writes data through VitalSync SDK and direct GraphQL, with sync propagating changes back to Ontraport.
- **Primary admin pages:** Dashboard, Customers List, Customer Detail, New Customer, New Inquiry, Job Detail, Notifications.
- **Secondary areas:** Inquiry Detail (Alpine.js) and Service Provider portal are in scope, but admin core is the highest implementation priority.

## Data and Runtime Model
- **One codebase, two runtimes:** Dev pages under `dev/` for local/testing; Ontraport production pages use `html/admin/` snippets (header/body/footer) that load JS/CSS from GitHub Pages.
- **Config bridge:** `src/js/config.js` is the source of runtime config keys (`API_KEY`, detail URL templates, page URLs, IDs, etc.). In dev, values come from mock scripts and local overrides; in production, values come from Ontraport merge fields.
- **GraphQL endpoint:** `https://{slug}.vitalstats.app/api/v1/graphql` (for list/detail queries where direct GraphQL is more reliable).
- **SDK endpoint/init:** VitalSync SDK loaded in header, then initialized via `window.initVitalStatsSDK(...)` in `src/js/vitalsync.js`.

## Admin Core Implementation Checklist
- **Dashboard:** View action navigates using URL templates (`INQUIRY_DETAIL_URL_TEMPLATE`, `JOB_DETAIL_URL_TEMPLATE`, etc.); Create uses `NEW_INQUIRY_URL`; Customers link uses `CUSTOMERS_LIST_URL`.
- **Customers List:** Uses direct GraphQL (`calcContacts`) with real API key when available; fallback mock data is dev-only safety net.
- **Customer Detail:** Requires `?contact=<id>`; pulls contact and related records via GraphQL.
- **New Inquiry / Job Detail:** Existing controllers are functional baselines; align fields, actions, and interaction flow to approved Figma designs.
- **Notifications:** Keep tab filters and read/unread behavior consistent with design expectations.

## Figma-to-Build Workflow
- Use Figma links or screenshots as the source of truth for layout hierarchy, interaction behavior, and content structure.
- Reuse existing project patterns/components before introducing new structures.
- Validate behavior in `npm run dev` (`http://localhost:8000/dev/`) with a real API key where possible.
- Implement functional parity first (navigation/data/actions), then visual parity (spacing/copy/polish).

## Next-Step Workflow (Admin Core)
1. Collect Figma links/screenshots for Dashboard, Customers List, Customer Detail, New Inquiry, and Job Detail.
2. Compare current behavior to design intent and list concrete page-level gaps.
3. Fix highest-impact gaps first: broken navigation/data flow/actions, then UI parity and refinements.

## Deferred Integration: n8n Webhooks
- Ontraport email actions are not suitable for aggregated record batches (e.g. "Email List to Serviceman").
- Use an n8n webhook for batch delivery flows once n8n is available.
- Expected flow: dashboard builds filtered aggregate payload → POST to n8n webhook → wait for webhook response/status → show sent/failed result to admin.
- Until configured, batch actions should support on-screen filtering and preview only.

## Media Input Guidance
- **Images:** Supported. Attach screenshots/mockups for UI and behavior review.
- **Figma URLs:** Supported. Share `figma.com/design/...` links for direct design context.
- **Video:** Not directly supported for analysis. Use screenshots plus short step-by-step notes for flows/bugs.

## Quick Commands
- `npm run dev` — Start local dev server at **http://localhost:8000/dev/**
- `npm run parse-schema` — Re-generate types + schema reference from schema.xml

## Common Commands
- `npm run dev` — Start local dev server at **http://localhost:8000/dev/**
- `npm run parse-schema` — Re-generate types + schema reference from schema.xml
- `npm run sync:legacy:dry-run` — Validate sync mappings without writing data
- `npm run sync:legacy:feb-jobs` — Re-run February 2026 jobs import
- `npm run sync:legacy:backfill-feb-2026` — Re-run February 2026 jobs + inquiries backfill

No formal `test` or `lint` scripts exist in this repo yet. Verification is currently runtime-first: run the dev server, test the actual page flow, and confirm sync/report output for data jobs.

## Code Standards
- Simplicity first: every change should have minimal code impact and stay close to existing patterns.
- Find root causes; do not ship temporary patches when the underlying issue is known.
- Touch only what is necessary for the requested task; avoid unrelated edits.
- Read full files before editing; do not rewrite partial files in ways that drop existing logic.
- Preserve existing comments, naming style, file structure, and formatting conventions.
- Prefer existing vanilla JS patterns in `src/js/` over introducing new abstractions.

## Key Architecture
```text
src/
├── css/                 # Shared UI styles for dev + production snippets
├── js/                  # Page controllers, shared queries, config, utils
└── types/               # Generated schema-derived model metadata/JSDoc types

dev/                     # Local runnable pages (primary testing runtime)
html/admin/              # Ontraport snippet templates (header/body/footer)
scripts/sync/            # Legacy SQL -> GraphQL sync engine + mappings/reports
schema/                  # Source schema.xml + generated schema-reference.json
docs/                    # Project docs, SDK patterns, list-page/query guidance
```

## Workflow

### Planning (non-trivial tasks)
- Enter plan mode for tasks with 3+ steps, cross-file impact, or architectural decisions.
- Write a checklist plan in `tasks/todo.md` before implementation.
- Check in with the user before coding when scope/risk is non-trivial.
- If implementation drifts or fails unexpectedly, stop and re-plan.

### Implementation
- Work through `tasks/todo.md` in order and mark items complete as you go.
- Provide short high-level progress updates so the user can follow execution.
- Prove behavior before marking done (page verification, query results, reports).
- Ask: "Would a staff engineer approve this diff?"

### Bug Fixes
- When a clear bug is reported, reproduce, isolate root cause, and fix directly.
- Use logs/errors/failing behavior as evidence, then verify the fix with output.
- Avoid pushing debugging burden back to the user when the codebase can answer it.

### Elegance Check
- For non-trivial solutions, pause and evaluate if a cleaner design is available.
- If a fix is hacky but avoidable, refactor to the elegant version before finalizing.
- Skip over-engineering for straightforward one-line or localized fixes.

## Context Management
- Use subagents for broad research/exploration and parallel investigation.
- Keep each subagent focused on one concern to reduce noisy context.
- Summarize meaningful progress/state to `tasks/todo.md` during long tasks.
- Preserve current file list, key decisions, and verification commands in active notes.

## Self-Improvement
- After any correction from the user, add the pattern and prevention rule to `tasks/lessons.md`.
- Review relevant lessons at the start of new work in the same area.
- Keep `docs/learnings.md` as project-level human notes; use `tasks/lessons.md` for agent operating lessons.

## Verification
Never mark a task complete without proof.

- Run the relevant command(s) and confirm expected output.
- For UI changes, verify behavior in `http://localhost:8000/dev/` and describe what was observed.
- For sync/data tasks, verify report files and spot-check GraphQL results.
- Check logs for warnings/errors that indicate hidden regressions.

## Git Workflow
- Work on feature branches for implementation tasks; avoid direct main edits where possible.
- Use clear, conventional commit messages that describe intent.
- Keep commits atomic (one logical change per commit).

## What NOT To Do
- Do not apologize without action; fix the issue and show verification.
- Do not over-explain planned actions when execution can proceed immediately.
- Do not ask questions answerable by reading code, docs, schema, or logs.
- Do not provide placeholder code where real implementation is expected.
- Do not modify files outside the requested scope.

<!-- GOTCHAS:START — Auto-synced from VibeCodeApps. Do not edit manually. -->

These are the most important gotchas — memorize these to avoid common bugs:

- **`plugin.switchTo()` needs the INTERNAL prefixed name** (e.g. `ThcContact`), NOT `publicName` (`Contact`). The `publicName` is for UI labels and TypeScript type names only.
- **Always `.pipe(window.toMainInstance(true))`** on all `fetchAllRecords()` / `fetchOneRecord()` queries
- **SDK records have NON-ENUMERABLE properties** — `{ ...record }` and `Object.keys(record)` produce `{}` / `[]`. Use `record.getState()` to get a plain JS object with all properties. Critical for MUI DataGrid which needs enumerable `id` field.
- **Records are immutable** — never `Object.assign(record, data)` or `record.field = value`, always spread `{ ...existingData, ...newData }`
- **Subscription payloads are PLAIN objects** (no `getState()`), do NOT include `id`, and have `null`/`undefined` for unchanged fields — never blind-merge, only merge defined non-null values, and always preserve the known `id`
- **Mutations disrupt subscriptions** — after `mutation.execute()`, clean up and re-subscribe
- **MUI DataGrid editable columns should NOT use `valueGetter`** — it interferes with the edit mechanism
- **`import 'dotenv/config'` MUST be the first import** in Express server entry points
- **Express MUST bind `0.0.0.0`** (not `127.0.0.1`) for Docker and mobile access
- **Direct GraphQL `fetch()` is an alternative to SDK for complex queries** — useful for calc/aggregation queries, cross-model joins, `orderBy`, and `field()` aliasing. The SDK query builder *does* support calc queries; past failures were due to invalid field references, not SDK limitations.
- **VitalSync SDK rejects `capacitor://localhost` origin** — must set `server.url` in capacitor config to a real HTTP/HTTPS URL
- **Keep `.limit()` reasonable** — limits above ~1,000 can cause the SDK to hang. Use pagination instead.
- **Ontraport Vite dev server**: root: `.` with `open: '/dev/'` — NOT `root: 'dev'` which breaks `../src/` paths
<!-- GOTCHAS:END -->

## Reference Docs

Read these files on demand when working on the corresponding task:

- **`docs/vitalsync-sdk-patterns.md`** — VitalSync queries, subscriptions, mutations, direct GraphQL API, record conversion
- **`docs/vitalsync-list-pages.md`** — **List/table pages:** test API first, use direct GraphQL for lists, valid field names, dev vs live (API key, footer)
- **`docs/ontraport-app-workflow.md`** — Ontraport scaffolding workflow, merge fields, dynamic lists, config bridge
- **`docs/deployment.md`** — GitHub Pages deployment, cache busting, GitHub Actions
- **`docs/schema-format.md`** — Schema XML parsing reference, data types, enums, FKs
- **`docs/research-phase.md`** — Research script, data collectors, knowledge base
- **`docs/learnings.md`** — Project learnings (e.g. links not navigating with VitalSync, workarounds)

## Schema Workflow
1. Export schema XML from VitalStats and place at `schema/schema.xml`
2. Run `npm run parse-schema`
3. This generates:
   - `src/types/models.js` — JSDoc typedefs + MODELS metadata
   - `schema/schema-reference.json` — Full parsed schema reference
   - Updates the Schema Reference section below

## Reusable Feature Patterns

Check `docs/features/` for pre-built feature implementations that can be added to this app. Each file documents a complete feature with architecture, file list, dependencies, and implementation steps.

## Feature Contribution

When you build a significant new reusable feature in this app (e.g., a new integration, a complex UI pattern, a data pipeline), **proactively offer to document it** for reuse in future projects:

1. Create a feature doc in `docs/features/` following the template in `docs/features/README.md`
2. Include: architecture overview, all files involved, dependencies, env vars, gotchas
3. Tell the user: *"This feature could benefit other projects. I've documented it in `docs/features/`. You can contribute it back to VibeCodeApps by copying it to `../VibeCodeApps/docs/features/` and running `./scripts/sync-child.sh --all`."*

## Staying Current

This project's docs were synced from VibeCodeApps on the date in `docs/.sync-version`. If the parent project has been updated (new features, fixed gotchas, improved patterns), the user can re-sync:
```bash
cd ../VibeCodeApps && ./scripts/sync-child.sh ../ptpm-app
```

<!-- SCHEMA:START — Auto-generated by parse-schema.js. Do not edit manually. -->
## Schema Reference

50 tables, 1316 columns. Full details: `schema/schema-reference.json`

### Automation (SDK: `PeterpmAutomation`) — 7 fields
**Other:** id(PK), created_at(ts), deleted(bool), last_modified_at(ts), name, object_type_id, pause(bool)

### AutomationLogEntry (SDK: `PeterpmAutomationLogEntry`) — 27 fields
**Other:** id(PK), Activity_id(FK→Activity), Affiliation_id(FK→Affiliation), Announcement_id(FK→Announcement), Appointment_id(FK→Appointment), Company_id(FK→Company), Contact_id(FK→Contact), Deal_id(FK→Deal), ForumComment_id(FK→ForumComment), ForumPost_id(FK→ForumPost), JobDeal_id(FK→JobDeal), Job_id(FK→Job), Material_id(FK→Material), OServiceProvidedServiceProviderofService_id(FK→OServiceProvidedServiceProviderofService), OServiceProviderWhoViewedThisDeal_id(FK→OServiceProviderWhoViewedThisDeal), OTaggedUserTaggedComment_id(FK→OTaggedUserTaggedComment), Property_id(FK→Property), ServiceProvider_id(FK→ServiceProvider), Service_id(FK→Service), Upload_id(FK→Upload), User_id(FK→User), created_at(ts), description(json), object_id, object_type_id, resource, type(enum:20 values)

### Blast (SDK: `PeterpmBlast`) — 2 fields
**Other:** id(PK), created_at(ts)

### BusinessInformation (SDK: `PeterpmBusinessInformation`) — 13 fields
**Other:** id(PK), business_address, business_address_2, business_brand_primary_color(color string - hex, rgb, rgba, hsl), business_city, business_country(countryCode), business_fax, business_logo(imageUrl), business_name, business_state(ISO 3166-2 code as string without the country prefix. Ex: US-FL = FL), business_telephone, business_website(url), business_zip

### MessageTemplate (SDK: `PeterpmMessageTemplate`) — 12 fields
**Other:** id(PK), created_at(ts), deletable(bool), inline, json_data, last_modified_at(ts), last_sent, name, resource, sent, status(enum:Approved|Not Submitted|Rejected|Submitted for Review), type(enum:Double Opt-In (ONTRAMail)|Double Opt-In (legacy)|Invoice (ONTRAMail)|Invoice (legacy))

### MetaObject (SDK: `PeterpmMetaObject`) — 15 fields
**Other:** id(PK), date_created(ts), deletable(bool), external_key, icon, key, name, object_label, plural, plural_possessive, possessive, primary_nav, singular, table, theme

### ObjectLogEntry (SDK: `PeterpmObjectLogEntry`) — 36 fields
**Other:** id(PK), Activity_id(FK→Activity), Affiliation_id(FK→Affiliation), Announcement_id(FK→Announcement), Appointment_id(FK→Appointment), Company_id(FK→Company), Contact_id(FK→Contact), Deal_id(FK→Deal), ForumComment_id(FK→ForumComment), ForumPost_id(FK→ForumPost), JobDeal_id(FK→JobDeal), Job_id(FK→Job), Material_id(FK→Material), OServiceProvidedServiceProviderofService_id(FK→OServiceProvidedServiceProviderofService), OServiceProviderWhoViewedThisDeal_id(FK→OServiceProviderWhoViewedThisDeal), OTaggedUserTaggedComment_id(FK→OTaggedUserTaggedComment), Property_id(FK→Property), ServiceProvider_id(FK→ServiceProvider), Service_id(FK→Service), Upload_id(FK→Upload), User_id(FK→User), automation_id(FK→Automation), blast_id(FK→Blast), message_id(FK→Message), created_at(ts), details(longtext), entry_items_count, merge_data(json), object_id, object_type_id, split_num, status(enum:15 values), step_num, subject, type(enum:26 values), vtype

### ObjectLogEntryItem (SDK: `PeterpmObjectLogEntryItem`) — 13 fields
**Other:** id(PK), message_id(FK→Message), object_log_entry_id(FK→ObjectLogEntry), action_id, created_at(ts), details, item_order, merge_data(json), object_type_id, resource, status(enum:15 values), type(enum:26 values), vtype

### OntraportListFieldOption (SDK: `PeterpmOntraportListFieldOption`) — 5 fields
**Other:** id(PK), description, fieldId, name, objectId

### QueuedMessage (SDK: `PeterpmQueuedMessage`) — 7 fields
**Other:** id(PK), name, processing(bool), recipients, scheduled_delivery(ts), subject, type(enum:Email|SMS)

### Role (SDK: `PeterpmRole`) — 3 fields
**Other:** id(PK), role_manager_id(FK→Role), role

### Tag (SDK: `PeterpmTag`) — 3 fields
**Other:** tag_id(PK), name, object_type_id

### TaskOutcome (SDK: `PeterpmTaskOutcome`) — 2 fields
**Other:** id(PK), name

### TrackingCampaign (SDK: `PeterpmTrackingCampaign`) — 3 fields
**Other:** id(PK), created_at(ts), last_modified_at(ts)

### TrackingContent (SDK: `PeterpmTrackingContent`) — 3 fields
**Other:** id(PK), created_at(ts), last_modified_at(ts)

### TrackingLeadSource (SDK: `PeterpmTrackingLeadSource`) — 3 fields
**Other:** id(PK), created_at(ts), last_modified_at(ts)

### TrackingMedium (SDK: `PeterpmTrackingMedium`) — 3 fields
**Other:** id(PK), created_at(ts), last_modified_at(ts)

### TrackingTerm (SDK: `PeterpmTrackingTerm`) — 3 fields
**Other:** id(PK), created_at(ts), last_modified_at(ts)

### ObjectRelationship (SDK: `PeterpmObjectRelationship`) — 10 fields
**Other:** id(PK), related_object_id(FK→MetaObject), editable, name, object_1_field, object_2_field, object_type_id, this_object_is(enum:-|Child|Parent), type(enum:Many to many|One to many|One to one), viewable

### TagSubscriber (SDK: `PeterpmTagSubscriber`) — 24 fields
**Other:** id(PK), Activity_id(FK→Activity), Affiliation_id(FK→Affiliation), Announcement_id(FK→Announcement), Appointment_id(FK→Appointment), Company_id(FK→Company), Contact_id(FK→Contact), Deal_id(FK→Deal), ForumComment_id(FK→ForumComment), ForumPost_id(FK→ForumPost), JobDeal_id(FK→JobDeal), Job_id(FK→Job), Material_id(FK→Material), OServiceProvidedServiceProviderofService_id(FK→OServiceProvidedServiceProviderofService), OServiceProviderWhoViewedThisDeal_id(FK→OServiceProviderWhoViewedThisDeal), OTaggedUserTaggedComment_id(FK→OTaggedUserTaggedComment), Property_id(FK→Property), ServiceProvider_id(FK→ServiceProvider), Service_id(FK→Service), Upload_id(FK→Upload), User_id(FK→User), tag_id(FK→Tag), object_id, object_type_id

### User (SDK: `PeterpmUser`) — 29 fields
**Other:** id(PK), manager_id(FK→User), role_id(FK→Role), business_address, business_address2, business_city, business_country(countryCode), business_name, business_state(ISO 3166-2 code as string without the country prefix. Ex: US-FL = FL), business_zip_postal, cell_phone, cell_phone_for_authentication, email(email), email_from_name, fax(phone), first_name, image(imageUrl), language(enum:10 values), last_activity(ts), last_login(ts), last_name, login, password, profile_image(imageUrl), reply_to_email(email), status, telephone, timezone(tz), unique_id

### Contact (SDK: `PeterpmContact`) — 109 fields
**System Information:** id(PK), spent(decimal), twitter, facebook, linkedin, timezone(tz), instagram, last_note, unique_id, created_at(ts), ip_address, user_agent, last_activity(ts), last_sms_sent(ts), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Contact Information:** fax(phone), city, email(email), state(ISO 3166-2 code as string without the country prefix. Ex: US-FL = FL), title, address, country(countryCode), website(url), birthday(ts), zip_code, address_2, last_name, test_file(json), company_id(FK→Company), first_name, lot_number, sms_number, postal_city, postal_code, unit_number, office_phone, postal_state, profile_image(imageUrl), postal_address, postal_country, job_required_by, postal_address_2
**Lead Information:** gclid, score, owner_id(FK→User), priority(enum:High|Low|Medium), sales_stage(enum:7 values), facebook_fbc, facebook_fbp, ga_client_id, inquiring_as(enum:Business Entity|Government|Individual), last_term_id(FK→TrackingTerm), first_term_id(FK→TrackingTerm), ga_session_id, last_medium_id(FK→TrackingMedium), referring_page, bulk_sms_status(bool), first_medium_id(FK→TrackingMedium), last_content_id(FK→TrackingContent), first_content_id(FK→TrackingContent), last_campaign_id(FK→TrackingCampaign), bulk_email_status(bool), first_campaign_id(FK→TrackingCampaign), ga_session_number, linked_in_click_id, last_lead_source_id(FK→TrackingLeadSource), first_lead_source_id(FK→TrackingLeadSource), time_since_last_activity(enum:More than a month ago (Cold)|This Week|This month|Today (Hot!))
**SMS Merge Fields:** last_inbound_sms
**Invoice Info:** last_invoice, last_charge_amount(currency), last_total_invoice_amount(currency), total_amount_of_unpaid_transactions(currency)
**Last Credit Card Used:** last_card_type(enum:7 values), last_cc_status(enum:[object Object]|Declined|Success), last_card_number_last_4, last_card_expiration_date(ts), last_card_expiration_year, last_card_expiration_month(enum:12 values)
**My Profile Information:** display_name
**My Profile app | My Profile:** my_profile_app_my_profile_url(url), my_profile_app_my_profile_visits, my_profile_app_my_profile_published(bool), my_profile_app_my_profile_unique_visits
**My Profile app | Security and Privacy:** my_profile_app_security_and_privacy_url(url), my_profile_app_security_and_privacy_visits, my_profile_app_security_and_privacy_published(bool), my_profile_app_security_and_privacy_unique_visits
**Possum Man Custom Database Fields:** how_referred(enum:24 values)
**Site Visit Details:** plus_or_minus(enum:Minus|Plus), select_services(enum:Gutter Cleaning|Possum Removal|Roof Cleaning|Wasp Removal), warranty_details, scheduled_date_time(ts), quote_variation_text, reason_for_rescheduling(longtext)
**Memo Notifications:** notification_alias, notification_method(enum:Email|Email & SMS|SMS)
**Xero Information:** xero_contact_id
**Event Fields:** activity_id_on_event
**Popup Comment:** popup_comment(longtext)
**Legacy Fields:** legacy_sync_hash, legacy_source_entity, legacy_source_system, legacy_last_synced_at(ts), legacy_sql_customer_id

### JobDeal (SDK: `PeterpmJobDeal`) — 14 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)

### Message (SDK: `PeterpmMessage`) — 33 fields
**Other:** id(PK), owner_id(FK→User), autosave, clicked_count, complaints_count, created_at(ts), from, json_data(longtext), last_auto(ts), last_modified_at(ts), last_save(ts), message_body(longtext), name, not_clicked_count, not_opened_count, object_type_id, old_resource(longtext), opened_count, plaintext(longtext), reply_to_email, resource(json), send_from_email, send_out_name, send_to, sent_count, site_id, spam_score(float), subject, transactional_email(bool), type(enum:10 values), unsubscribed_count, utm_tracking, word_wrap_checkbox

### Note (SDK: `PeterpmNote`) — 28 fields
**Other:** id(PK), Activity_id(FK→Activity), Affiliation_id(FK→Affiliation), Announcement_id(FK→Announcement), Appointment_id(FK→Appointment), Company_id(FK→Company), Contact_id(FK→Contact), Deal_id(FK→Deal), ForumComment_id(FK→ForumComment), ForumPost_id(FK→ForumPost), JobDeal_id(FK→JobDeal), Job_id(FK→Job), Material_id(FK→Material), OServiceProvidedServiceProviderofService_id(FK→OServiceProvidedServiceProviderofService), OServiceProviderWhoViewedThisDeal_id(FK→OServiceProviderWhoViewedThisDeal), OTaggedUserTaggedComment_id(FK→OTaggedUserTaggedComment), Property_id(FK→Property), ServiceProvider_id(FK→ServiceProvider), Service_id(FK→Service), Upload_id(FK→Upload), User_id(FK→User), author_id(FK→User), date_created(ts), last_modified_at(ts), note(longtext), object_id, object_type_id, type(enum:API|Form|Incoming|Manual|Outgoing)

### Service (SDK: `PeterpmService`) — 35 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Service Information:** service_name, service_type(enum:Add On|Option|Primary), service_image(imageUrl), service_price(currency), standard_warranty(longtext), service_description(longtext), service_option_count
**Web Content:** title, hero_image(imageUrl), description(longtext), primary_banner(imageUrl)
**Xero Item Information:** item_id, item_code, add_to_xero(bool), api_response, item_sales_account
**Service Option Information:** primary_service_id(FK→Service)
**Quote Information:** quote_attachment_1(json), quote_attachment_2(json), quote_attachment_title, quote_attachment_description(longtext)

### TaskNote (SDK: `PeterpmTaskNote`) — 4 fields
**Other:** id(PK), author_id(FK→User), created_at(ts), note(longtext)

### Company (SDK: `PeterpmCompany`) — 38 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**COMPANY INFO:** city, name, type(enum:Business|Family/Individual), phone, state(ISO 3166-2 code as string without the country prefix. Ex: US-FL = FL), address(address), industry(enum:22 values), description(longtext), postal_code, facebook_page, annual_revenue(enum:1m - 5m|20m - 50m|50m - 100m|5m - 20m|< 1m|> 100m), instagram_name, number_of_employees(enum:10 - 50|1000 +|200 - 1000|50 - 200|< 10)
**Xero Information:** xero_contact_id
**PRimary Contact & Accounts Contact:** primary_person_id(FK→Contact), accounts_contact_id(FK→Affiliation)
**Acount Type:** account_type(enum:8 values), body_corporate_company_id(FK→Company)
**Popup Comment:** popup_comment(longtext)
**Legacy Fields:** legacy_sync_hash, legacy_source_entity, legacy_source_system, legacy_last_synced_at(ts), legacy_sql_company_id

### ServiceProvider (SDK: `PeterpmServiceProvider`) — 88 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Service Provider Information:** status(enum:Active|Archived|Offline|On-Site), work_email(email), mobile_number(phone), bulk_sms_status(bool), pending_payment, accepted_payment, declined_payment, bulk_email_status(bool), remove_status_after(enum:1 Hour|12 Hour|2 Hour|24 Hour|3 Hour|5 Hour), contact_information_id(FK→Contact), emergency_contact_number(phone)
**Service Provider Profile:** workload_capacity(enum:ABSENT|BUSY|LOOKING|OKAY), job_rate_percentage
**Payments Information:** abn, bsb, account_name, account_number, gst_registered(bool), last_bill_date(ts), next_bill_date(ts), last_batch_code, next_batch_code, last_xero_bill_id, last_bill_due_date(ts), next_bill_due_date(ts), process_next_batch(bool), last_bill_paid_date(ts), business_entity_name, bill_items_to_be_paid_count, bill_items_to_be_paid_total(decimal), bill_items_to_be_processed_count, bill_items_to_be_processed_total(decimal)
**Pest Control:** license_number
**Calendar Integration:** shareable_link(url), google_calendar_id
**Profile Details:** profile_details_url(url), profile_details_visits, profile_details_published(bool), profile_details_unique_visits
**Materials Information:** process_non_job_materials_owed(bool), materials_total_deductions_owed(decimal), total_non_job_materials_balance(currency), materials_total_reimbursements_owed(decimal), materials_non_job_deductions_to_be_paid(decimal), materials_non_job_reimbursements_to_be_paid(decimal)
**Xero Section:** xero_bill_pdf(url), xero_tax_rate, xero_contact_id, xero_api_response, xero_bill_item_code, xero_bill_account_code
**Job Stats:** jobs_in_progress, new_jobs_last_30_days, call_backs_last_30_days, completed_jobs_last_30_days
**general settings:** pause_all_notification(bool)
**Inquriy notification preferences:** inquiries(bool)
**quotes notification preferences:** quotes_jobs(bool)
**Payments notification preferences:** approval_by_admin(bool)
**MEMOS:** memos_comments(bool)
**Inquiry DEtails:** total_inquiries
**Untitled:** scheduled_visits
**Team type:** type(enum:Admin|Service Provider)
**Availability Information:** ok, busy, looking
**PTPM : Service Provider Portal - Profile:** PTPM__Service_Provider_Portal_Profile_URL(url), PTPM__Service_Provider_Portal_Profile_visits, PTPM__Service_Provider_Portal_Profile_published(bool), PTPM__Service_Provider_Portal_Profile_unique_visits
**LEgacy Fields:** legacy_source_entity, legacy_source_system, legacy_last_synced_at(ts), legacy_sql_service_provider_id

### Task (SDK: `PeterpmTask`) — 37 fields
**Other:** id(PK), Activity_id(FK→Activity), Affiliation_id(FK→Affiliation), Announcement_id(FK→Announcement), Appointment_id(FK→Appointment), Company_id(FK→Company), Contact_id(FK→Contact), Deal_id(FK→Deal), ForumComment_id(FK→ForumComment), ForumPost_id(FK→ForumPost), JobDeal_id(FK→JobDeal), Job_id(FK→Job), Material_id(FK→Material), OServiceProvidedServiceProviderofService_id(FK→OServiceProvidedServiceProviderofService), OServiceProviderWhoViewedThisDeal_id(FK→OServiceProviderWhoViewedThisDeal), OTaggedUserTaggedComment_id(FK→OTaggedUserTaggedComment), Property_id(FK→Property), ServiceProvider_id(FK→ServiceProvider), Service_id(FK→Service), Upload_id(FK→Upload), User_id(FK→User), assignee_id(FK→User), outcome_id(FK→TaskOutcome), task_id(FK→Message), date_assigned(ts), date_complete(ts), date_due(ts), details(longtext), hidden(bool), notifications, object_id, object_type_id, rules, status(enum:Canceled|Completed|Open), step_num, subject, type(enum:Quick Task|Task)

### OServiceProvidedServiceProviderofService (SDK: `PeterpmOServiceProvidedServiceProviderofService`) — 5 fields
**Service Provided /Service Provider of Service Information:** id(PK), created_at(ts), service_provided_id(FK→Service), service_provider_of_service_id(FK→ServiceProvider)
**Other:** last_modified_at(ts)

### Property (SDK: `PeterpmProperty`) — 45 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Property Information:** state(enum:8 values), country(countryCode), address_1(address), address_2(address), lot_number, postal_code, suburb_town, unit_number, property_name, building_complex_id(FK→Property)
**Property Description:** manhole(bool), stories, bedrooms(enum:1|2|3|4+), building_age, building_type(enum:House|Offices|Other|Unit|Unit Block|Warehouse), property_type(enum:Commercial|Industrial|Residential), foundation_type(enum:Highset|Lowset|Slab on Ground), building_type_other, building_features_options_as_text
**Job Information:** last_gutter_job(ts), last_rodent_job(ts), last_rodent_job_rate(currency), last_gutter_job_price(currency)
**Property Owner And Resident:** owner_type(enum:Business|Investor|Owner Occupier), owner_company_id(FK→Company), individual_owner_id(FK→Contact), primary_owner_contact_for_property_id(FK→Affiliation), primary_resident_contact_for_property_id(FK→Affiliation), primary_property_manager_contact_for_property_id(FK→Affiliation)
**Admin Only:** quadrant(enum:7 values), building_type_sql_db(enum:14 values)

### TaskHistoryItem (SDK: `PeterpmTaskHistoryItem`) — 5 fields
**Other:** id(PK), author_id(FK→User), task_id(FK→Task), created_at(ts), note(longtext)

### Affiliation (SDK: `PeterpmAffiliation`) — 25 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Affiliation Information:** role, company_id(FK→Company), contact_id(FK→Contact), company_as_accounts_contact_id(FK→Company)
**Property Affiliations:** property_id(FK→Property), primary_owner_contact(bool), primary_resident_contact(bool), primary_property_manager_contact(bool), property_as_primary_owner_contact_id(FK→Property), property_as_primary_property_manager_id(FK→Property), property_as_primary_resident_contact_id(FK→Property)

### Deal (SDK: `PeterpmDeal`) — 120 fields
**System Information:** id(PK), owner_id(FK→User), deal_size(enum:$$ Large $$|Medium|Small), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts), expected_close_timeframe(enum:8 values)
**Deal Info:** deal_name, deal_value(currency), sales_stage(enum:7 values), expected_win, weighted_value(currency), recent_activity(enum:Active in the last month|Active in the last week|Active more than a month ago), actual_close_date(ts), expected_close_date(ts)
**Inquiry Information:** type(enum:11 values), other, call_back(bool), inquiry_source(enum:Email|Phone Call|SMS|Web Form), inquiry_status(enum:11 values), how_can_we_help(longtext), quote_record_id(FK→Job), how_did_you_hear(enum:8 values), inquiry_for_job_id(FK→Job), service_inquiry_id(FK→Service)
**PRoperty Information:** property_id(FK→Property)
**Quote Creation Form:** quote_creation_form_url(url), quote_creation_form_visits, quote_creation_form_published(bool), quote_creation_form_unique_visits
**Inquiry Thank You:** inquiry_thank_you_url(url), inquiry_thank_you_visits, inquiry_thank_you_published(bool), inquiry_thank_you_unique_visits
**Resident's Feedback:** renovations, date_job_required_by(ts), resident_availability, noise_signs_options_as_text, pest_location_options_as_text, pest_active_times_options_as_text
**Inquiry Details : Schedule Visit:** inquiry_details_schedule_visit_url(url), inquiry_details_schedule_visit_visits, inquiry_details_schedule_visit_published(bool), inquiry_details_schedule_visit_unique_visits
**Inquiry Details : Re-Schedule Visit:** inquiry_details_re_schedule_visit_url(url), inquiry_details_re_schedule_visit_visits, inquiry_details_re_schedule_visit_published(bool), inquiry_details_re_schedule_visit_unique_visits
**Service Provider:** service_provider_id(FK→ServiceProvider)
**Inquiry Admin Edit:** inquiry_admin_edit_url(url), inquiry_admin_edit_visits, inquiry_admin_edit_published(bool), inquiry_admin_edit_unique_visits
**Inquiry return info:** inquiry_return_reason(longtext), return_inquiry_to_admin(bool)
**Inquiry Details:** inquiry_details_url(url), inquiry_details_visits, inquiry_details_published(bool), inquiry_details_unique_visits
**Admin Notes:** admin_notes(longtext)
**Notes Bug Testing - Deals:** notes_bug_testing_deals_url(url), notes_bug_testing_deals_visits, notes_bug_testing_deals_published(bool), notes_bug_testing_deals_unique_visits
**op test 801533:** op_test_801533_url(url), op_test_801533_visits, op_test_801533_published(bool), op_test_801533_unique_visits
**2nd801533Test:** f_2nd801533_test_url(url), f_2nd801533_test_visits, f_2nd801533_test_published(bool), f_2nd801533_test_unique_visits
**Client Information:** company_id(FK→Company), account_type(enum:Company|Contact), client_notes(longtext), primary_contact_id(FK→Contact)
**Admin Fields:** service_type(enum:15 values), PTPM_Last_Action_At(ts), PTPM_Last_Action_Type, PTPM_Last_Action_Source(enum:app|manual|n8n|ontraport_automation), PTPM_Last_Action_Status(enum:failed|processing|queued|succeeded), calc_field_don_t_remove, PTPM_Last_Action_Message(longtext), PTPM_Last_Action_Request_ID, service_provider_id_inquiry
**Inquiry Details Test Only:** inquiry_details_test_only_url(url), inquiry_details_test_only_visits, inquiry_details_test_only_published(bool), inquiry_details_test_only_unique_visits
**PTPM : Manage Deal Record Form:** ptpm_manage_deal_record_form_url(url), ptpm_manage_deal_record_form_visits, ptpm_manage_deal_record_form_published(bool), ptpm_manage_deal_record_form_unique_visits
**PTMP Admin Portal New : Inquiry Details Page:** ptmp_admin_portal_new_inquiry_details_page_url(url), ptmp_admin_portal_new_inquiry_details_page_visits, ptmp_admin_portal_new_inquiry_details_page_published(bool), ptmp_admin_portal_new_inquiry_details_page_unique_visits
**create-inquiry:** create_inquiry_url(url), create_inquiry_visits, create_inquiry_published(bool), create_inquiry_unique_visits
**Task Information:** open_tasks
**PTPM : Service Provider Portal - Inquiry Details:** PTPM__Service_Provider_Portal_Inquiry_Details_URL(url), PTPM__Service_Provider_Portal_Inquiry_Details_visits, PTPM__Service_Provider_Portal_Inquiry_Details_published(bool), PTPM__Service_Provider_Portal_Inquiry_Details_unique_visits
**Legacy Fields:** legacy_sync_hash, legacy_sql_deal_id, legacy_source_entity, legacy_source_system, legacy_last_synced_at(ts)

### PropertyBuildingFeaturesOption (SDK: `PeterpmPropertyBuildingFeaturesOption`) — 3 fields
**Other:** id(PK), optionId(FK→OntraportListFieldOption), recordId(FK→Property)

### DealNoiseSignsOption (SDK: `PeterpmDealNoiseSignsOption`) — 3 fields
**Other:** id(PK), optionId(FK→OntraportListFieldOption), recordId(FK→Deal)

### DealPestActiveTimesOption (SDK: `PeterpmDealPestActiveTimesOption`) — 3 fields
**Other:** id(PK), optionId(FK→OntraportListFieldOption), recordId(FK→Deal)

### DealPestLocationOption (SDK: `PeterpmDealPestLocationOption`) — 3 fields
**Other:** id(PK), optionId(FK→OntraportListFieldOption), recordId(FK→Deal)

### Job (SDK: `PeterpmJob`) — 206 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Job Information:** job_gst(currency), pca_done(bool), priority(enum:High|Low|Medium), job_total(currency), job_status(enum:10 values), date_booked(ts), property_id(FK→Property), account_type(enum:Company|Contact|None), date_started(ts), mark_complete(bool), prestart_done(bool), date_cancelled(ts), date_completed(ts), date_scheduled(ts), payment_status(enum:Cancelled|Invoice Required|Invoice Sent|Overdue|Paid|Written Off), client_entity_id(FK→Company), calculate_job_price(bool), client_individual_id(FK→Contact), job_activity_subtotal(decimal), activities_to_complete
**Quote Information:** quote_gst(currency), quote_date(ts), quote_note(longtext), quote_total(currency), quote_status(enum:7 values), follow_up_date(ts), tasks_on_quote, date_quote_sent(ts), options_on_quote, inquiry_record_id(FK→Deal), quote_valid_until(ts), date_quote_requested(ts), date_quoted_accepted(ts), quote_variation_text, quote_variation_type(enum:Minus|Plus), calculate_quote_price(bool), quote_variation_price(currency), quoted_activities_subtotal(decimal), accepted_quote_activity_price(decimal), terms_and_conditions_accepted(bool), time_terms_and_conditions_agreed(ts)
**Feedback Information:** rating(enum:1|2|3|4|5), feedback_text(longtext), feedback_number, feedback_status(enum:Completed|Requested), date_feedback_requested(ts), date_feedback_submitted(ts)
**Invoice Information:** invoice_id, payment_id, invoice_total(currency), invoice_number, payment_method(enum:Bartercard|Cash|Cheque|Direct Deposit|Invoice), send_to_contact(bool), xero_invoice_pdf(url), Part_Payment_Made(currency), invoice_url_admin(url), xero_api_response, invoice_url_client(url), xero_invoice_status(enum:Awaiting payment|Create Invoice|Failed|Paid|Update Invoice)
**Service Provider Payment:** bill_date(ts), bill_xero_id, bill_batch_id, bill_due_date(ts), bill_time_paid(ts), reset_batch_id(bool), bill_batch_date(ts), bill_batch_week, xero_bill_status(enum:7 values), bill_approval_time(ts), bill_approved_admin(bool), bill_approved_service_provider(bool)
**Quote Creator:** quote_creator_url(url), quote_creator_visits, quote_creator_published(bool), quote_creator_unique_visits
**Quote Template - Client View:** quote_template_client_view_url(url), quote_template_client_view_visits, quote_template_client_view_published(bool), quote_template_client_view_unique_visits
**Service PRovider Information:** bill_gst(currency), bill_total(currency), return_job_to_admin(bool), primary_service_provider_id(FK→ServiceProvider)
**Activity Information:** activities_on_job
**Referral Information:** referrer_id(FK→Contact)
**Feedback: Form Job:** feedback_form_job_url(url), feedback_form_job_visits, feedback_form_job_published(bool), feedback_form_job_unique_visits
**Possum Man Custom database Fields:** job_type(enum:20 values), location_name(enum:8 values), possum_number, turkey_number, job_status_old(enum:8 values), possum_comment, turkey_comment, follow_up_comment(longtext), turkey_release_site(enum:10 values), noise_signs_options_as_text
**Admin:** signature(imageUrl), PTPM_Last_Action_At(ts), admin_recommendation(longtext), PTPM_Last_Action_Type, PTPM_Last_Action_Source(enum:app|manual|n8n|ontraport_automation), PTPM_Last_Action_Status(enum:failed|processing|queued|succeeded), PTPM_Last_Action_Message(longtext), PTPM_Last_Action_Request_ID
**Form: Prestart:** form_prestart_url(url), form_prestart_visits, form_prestart_published(bool), form_prestart_unique_visits
**Forms:** all_files_submitted, all_forms_submitted, all_photos_submitted, prestart_form_submitted
**Form: Pest Control Advice:** form_pest_control_advice_url(url), form_pest_control_advice_visits, form_pest_control_advice_published(bool), form_pest_control_advice_unique_visits
**View Job Photos:** view_job_photos_url(url), view_job_photos_visits, view_job_photos_published(bool), view_job_photos_unique_visits
**Related Xero Entity:** accounts_contact_id(FK→Affiliation)
**Past Job Information:** past_job_id(FK→Job), duplicate_job(bool), job_call_backs, create_a_callback(bool)
**PTPM : Edit Quote:** ptpm_edit_quote_url(url), ptpm_edit_quote_visits, ptpm_edit_quote_published(bool), ptpm_edit_quote_unique_visits
**PTPM : Edit Job:** ptpm_edit_job_url(url), ptpm_edit_job_visits, ptpm_edit_job_published(bool), ptpm_edit_job_unique_visits
**PTPM : Memos:** ptpm_memos_url(url), ptpm_memos_visits, ptpm_memos_published(bool), ptpm_memos_unique_visits
**PTPM : View Quote:** ptpm_view_quote_url(url), ptpm_view_quote_visits, ptpm_view_quote_published(bool), ptpm_view_quote_unique_visits
**Fields For Invoice:** due_date(ts), invoice_date(ts)
**Materials Information:** deduct_total(decimal), materials_total(decimal), reimburse_total(decimal)
**Deleted Fields:** del_activities_to_complete
**PTPM : Edit Quote Admin:** ptpm_edit_quote_admin_url(url), ptpm_edit_quote_admin_visits, ptpm_edit_quote_admin_published(bool), ptpm_edit_quote_admin_unique_visits
**Service Provider:** send_job_update_to_service_provider(bool)
**Client:** request_review(bool), email_o_quote_fu(bool), email_bc_quote_fu(bool), email_re_quote_fu(bool), email_manual_quote(bool), email_electronic_quote(bool), email_tenant_job_email(bool), email_customer_job_email(bool)
**Job Sheet:** job_sheet_url(url), job_sheet_visits, job_sheet_published(bool), job_sheet_unique_visits
**New Direct Job:** new_direct_job_url(url), new_direct_job_visits, new_direct_job_published(bool), new_direct_job_unique_visits
**JOb Variation:** job_variation_text, job_variation_type(enum:Minus|Plus), job_variation_price(currency)
**Task Information:** open_tasks, Urgent_Calls
**Legacy Fields:** popup_comment(longtext), legacy_sql_job_id, legacy_mapping_notes, legacy_source_entity, legacy_source_system, legacy_sql_followup_id, legacy_sql_orig_job_id, legacy_service_raw_json(longtext), legacy_mapping_confidence, legacy_service_raw_animal, legacy_service_raw_comments(longtext), legacy_service_raw_admin_comment(longtext), legacy_service_raw_possum_comment(longtext), legacy_service_raw_turkey_comment(longtext), legacy_service_raw_prestart_activity, legacy_service_raw_prestart_activity_other

### OServiceProviderWhoViewedThisDeal (SDK: `PeterpmOServiceProviderWhoViewedThisDeal`) — 5 fields
**Service Provider Who Viewed  This Deal/Deal  Viewed By This Service Provider Information:** id(PK), created_at(ts), service_provider_who_viewed_deal_id(FK→ServiceProvider), deal_viewed_by_this_service_provider_id(FK→Deal)
**Other:** last_modified_at(ts)

### Activity (SDK: `PeterpmActivity`) — 39 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Activity Information:** job_id(FK→Job), quantity, service_id(FK→Service), activity_text(longtext), date_required(ts), mark_complete(bool), activity_price(currency), date_completed(ts), activity_status(enum:Cancelled|Completed|Quoted|Reschedule|Scheduled|To Be Scheduled), invoice_to_client(bool)
**Activity Position:** task(enum:Job 1|Job 2|Job 3|Job 4|Job 5), option(enum:Option 1|Option 2|Option 3|Option 4)
**REport:** report(json)
**Quoted Activity Information:** note(longtext), warranty(longtext), quoted_text(longtext), quoted_price(currency), date_accepted(ts), quote_accepted(bool), include_in_quote(bool), include_in_quote_subtotal(bool)
**Edit Activity:** edit_activity_url(url), edit_activity_visits, edit_activity_published(bool), edit_activity_unique_visits

### Appointment (SDK: `PeterpmAppointment`) — 34 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Appointment Information:** type(enum:Inquiry|Job), title, status(enum:Cancelled|Completed|New|Scheduled|To Be Scheduled), host_id(FK→ServiceProvider), end_time(ts), start_time(ts), description, location_id(FK→Property), duration_hours(enum:0|1|2|3|4|5), duration_minutes(enum:0|15|30|45), primary_guest_id(FK→Contact)
**Google Calendar:** api_response, event_colour(enum:11 values), calendar_event_id
**Appointment Edit Page:** appointment_edit_page_url(url), appointment_edit_page_visits, appointment_edit_page_published(bool), appointment_edit_page_unique_visits
**Inquiry or Job Information:** job_id(FK→Job), inquiry_id(FK→Deal)

### ForumPost (SDK: `PeterpmForumPost`) — 34 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_sms_received(ts), last_email_received(ts)
**Post Info:** file(json), author_id(FK→Contact), post_copy(longtext), created_at(ts), post_image(imageUrl), post_title, post_status(enum:Flagged - Removed post|Published - Not flagged), post_upvotes, related_job_id(FK→Job), last_modified_at(ts), number_of_replies, related_inquiry_id(FK→Deal), author_notification, last_reply_date_and_time(ts)
**Forum Post Details Page Type:** forum_post_details_page_type_url(url), forum_post_details_page_type_visits, forum_post_details_page_type_published(bool), forum_post_details_page_type_unique_visits
**Edit Forum Post Record Test Page:** edit_forum_post_record_test_page_url(url), edit_forum_post_record_test_page_visits, edit_forum_post_record_test_page_published(bool), edit_forum_post_record_test_page_unique_visits

### JobNoiseSignsOption (SDK: `PeterpmJobNoiseSignsOption`) — 3 fields
**Other:** id(PK), optionId(FK→OntraportListFieldOption), recordId(FK→Job)

### Material (SDK: `PeterpmMaterial`) — 28 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Materials Information:** tax(enum:Exemptexpenses|Input), file(json), total(currency), job_id(FK→Job), status(enum:Assigned to Job|In Progress|New|Paid|Pending Payment), receipt(imageUrl), description(longtext), material_name, transaction_type(enum:Deduct|Reimburse), service_provider_id(FK→ServiceProvider)
**PAyment:** date_paid(ts), batch_code, xero_bill_id, date_scheduled(ts)

### Upload (SDK: `PeterpmUpload`) — 90 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Upload Information:** type(enum:File|Form|Photo), job_id(FK→Job), status(enum:Active|Delete), company_id(FK→Company), customer_id(FK→Contact), property_name_id(FK→Property), customer_can_view(bool)
**File Section:** file_name, file_upload(json)
**Photo Section:** photo_name, photo_upload(imageUrl)
**Form Section:** form_name, inquiry_id(FK→Deal), time_form_submitted(ts)
**Prestart Form:** dust(bool), pitch(bool), asbestos(bool), moisture(bool), degradation(bool), action_control(longtext), activity_other, roof_condition(bool), acknowledgement(bool), write_your_name, potential_hazard(longtext), ground_conditions(bool), pedestrian_traffic(bool), activity_description(enum:Dead removal|Other|Pigeon Proofing|Possum Proofing to Roof or Floors|Rat Treatment to Ceiling|Turkey Trapping), f_6_towing_a_trailer(bool), f_4_powered_hand_tools(bool), f_10_working_at_heights(bool), f_2_hazardous_chemicals(bool), pets_dangerous_wildlife(bool), f_5_removing_dead_animals(bool), f_3_non_powered_hand_tools(bool), f_7_use_of_portable_ladders(bool), f_8_working_alone_or_remote(bool), aboveground_services_inc_powerlines(bool), f_9_working_at_heights_using_an_ewp(bool), weather_storm_rain_hot_cold_or_wind(bool), f_1_driving_vehicles_on_or_off_roads(bool), plan_and_equipment_checked_for_faults(bool), do_you_have_the_right_ppe_for_the_task(bool), ppe_checked_for_faaults_damage_defacts(bool)
**Pest Control Advice:** garage, kitchen, rodents(bool), other_pest, between_floors, ceiling_void_s, external_walls, f_6_alphachloralose(bool), technicians_comments(longtext), f_8_dragnet_2_permethrin(bool), insecticide_powder_grams, rodenticide_blocks_grams, rodenticide_pellets_grams, redenticide_satchets_grams, time_sent_to_occupant_owner(ts), f_11_ditrac_0_005_brodifacoum(bool), f_1_ramik_50mg_kg_diphacinone(bool), f_5_racumin_0_37_coumateralyl(bool), f_10_contrac_0_005_bromodiolone(bool), f_12_biforce_100gm_l_bifenthrin(bool), plastic_bait_station_under_house, other_place_description_and_number, f_4_first_formula_0_005_brodifacoum(bool), f_7_country_permethrin_1_permethrin(bool), plastic_bait_station_where_and_number, f_2_sorexa_blocks_0_005g_kg_difenacoum(bool), f_9_sorexa_sachets_0_005g_kg_difenacoum(bool), f_3_generation_block_0_025g_kg_difethialone(bool)
**FORM:** form_url(url), form_visits, form_published(bool), form_unique_visits

### ForumComment (SDK: `PeterpmForumComment`) — 20 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Forum Comment Info:** comment(longtext), author_id(FK→Contact), created_at(ts), comment_status(enum:Flagged - Remove reply|Published - Not flagged)
**Relationships:** inquiry_id(FK→Deal), quote_job_id(FK→Job), forum_post_id(FK→ForumPost)

### Announcement (SDK: `PeterpmAnnouncement`) — 31 fields
**System Information:** id(PK), owner_id(FK→User), last_note, unique_id, created_at(ts), ip_address, last_activity(ts), last_sms_sent(ts), profile_image(imageUrl), last_email_sent(ts), last_call_logged(ts), last_modified_at(ts), last_sms_received(ts), last_email_received(ts)
**Announcement Information:** type(enum:Activity|Appointment|Comment|Inquiry|Post|Quote/Job), title, status(enum:Archived|Draft|Published), content, is_read(bool), post_id(FK→ForumPost), comment_id(FK→ForumComment), inquiry_id(FK→Deal), origin_url(url), quote_job_id(FK→Job), publish_date_time(ts), notified_contact_id(FK→Contact), service_provider_id_all, service_provider_id_inquiry, service_provider_id_quote_job, service_provider_id_forum_post, service_provider_id_fourm_comment

### OTaggedUserTaggedComment (SDK: `PeterpmOTaggedUserTaggedComment`) — 5 fields
**Tagged User/Tagged Comment Information:** id(PK), created_at(ts), tagged_user_id(FK→Contact), tagged_comment_id(FK→ForumComment)
**Other:** last_modified_at(ts)

<!-- SCHEMA:END -->

<!-- RESEARCH:START — Auto-generated by research.cjs. Do not edit manually. -->
_Run the research script to populate this section with business intelligence._
<!-- RESEARCH:END -->
