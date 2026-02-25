# VitalSync List Pages — Lessons from Customers List

When building **list/table pages** that load data from VitalSync (e.g. Customers List), use these patterns so the page shows **real data** instead of falling back to mock.

## 1. Test the API before building the UI

- **Run the query yourself** with a script or curl so you see the real response shape and field names.
- This repo has `scripts/test-contacts-api.js`: it calls the GraphQL API with the key from `.env` and prints contact count + sample. Run: `node scripts/test-contacts-api.js`.
- For a new list (e.g. properties, jobs), add a similar script that calls the relevant `calc*` query and log the result. Fix any invalid field names (GraphQL will error with "field X does not exist on model Y") **before** wiring the UI.

## 2. Prefer direct GraphQL for list fetches

- The **SDK path** (`fetchAllRecords()` / `fetchDirect()` with `pipe(toMainInstance(true))`) can be unreliable for some models or environments (empty response, wrong shape, or never resolving).
- For **listing records** (contacts, companies, etc.), use the **direct GraphQL API**:
  - Endpoint: `https://{slug}.vitalstats.app/api/v1/graphql` (e.g. `https://peterpm.vitalstats.app/api/v1/graphql`)
  - Headers: `Content-Type: application/json`, `Accept: application/json`, `Api-Key: <your-api-key>`
  - Body: `{ "query": "query calcContacts { calcContacts(limit: 1000, offset: 0) { id: field(arg: [\"id\"]) first_name: field(arg: [\"first_name\"]) ... } }" }`
- Response: `json.data.calcContacts` (or the relevant `calc*` key) is an **array of plain objects**. No SDK, no `getState()`, no `toMainInstance`.
- Same query that works in the test script will work in the browser (CORS permitting).

## 3. Use only fields that exist on the model

- GraphQL returns **400** with a message like `The field companyname does not exist on model PeterpmContact` if you request a non-existent field.
- **Do not assume** field names (e.g. `companyname`, `date_added`, `address1`) without checking the schema or a working query (e.g. from another page or the test script). When in doubt, start with a minimal set (id, first_name, last_name, email, etc.) and add fields once confirmed.

## 4. Dev vs live: one script, same API key source

- **One JS file** (e.g. `src/js/pages/customers-list.js`) is used by **both** dev and live. Changes there affect both.
- **Dev:** API key comes from `dev/mock-data.local.js` (`window.__MOCK_API_KEY__`). The dev HTML must set `window.AppConfig.API_KEY` from that **before** `config.js` runs (because `config.js` freezes `AppConfig`). Do it in the HEAD inline script right after loading mock-data.js and mock-data.local.js.
- **Live:** API key comes from Ontraport merge field (e.g. `[API Key]`) in the header HTML. Add a **footer** fragment (e.g. `html/admin/footer-<pagename>.html`) that loads config.js, utils.js, vitalsync.js, and the page script, then calls `window.Ptpm<Page>.init()` on DOMContentLoaded — same pattern as Dashboard / Job detail.

## 5. Optional: cache-bust and console logs during debug

- Use a query param on the script tag (e.g. `customers-list.js?v=3`) so the browser doesn’t serve an old cached file after fixes.
- Add short `console.log` / `console.warn` lines (e.g. "API key present?", "GraphQL response: records count = N", "GraphQL fetch failed: ...") so you can see in the console why the list is real vs mock.

## Quick checklist for a new list page

1. Add `scripts/test-<model>-api.js` (or re-use an existing one) and run it; confirm you get an array and the field names you need.
2. In the page JS, implement `loadData()` using `fetch()` to the GraphQL endpoint with the same `calc*` query and `Api-Key` header; map `json.data.calc*` to your table rows.
3. Ensure API key is set in dev (mock-data.local.js + HEAD script) and in production (merge field + footer that loads the page script).
4. If the list still shows mock/empty, check the console for the debug lines and fix the failing branch (no key, wrong fields, or CORS/network error).
