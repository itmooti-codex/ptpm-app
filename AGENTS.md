## Cursor Cloud specific instructions

### Service overview

This is a vanilla JS Ontraport app with no build step. The only local service is the **Vite dev server** (`npm run dev`), which serves static files at `http://localhost:8000/dev/`. There is no backend server, database, or Docker dependency for local development.

### Running the dev server

```
npm run dev
```

Starts Vite on port 8000 with `--open /dev/`. For headless/CI contexts, use `npx vite --host 0.0.0.0 --port 8000` to bind all interfaces without auto-opening a browser.

### Lint / Test

No formal `lint` or `test` npm scripts exist yet. Verification is runtime-first: start the dev server and test pages at `http://localhost:8000/dev/`. See `CLAUDE.md` for the full list of dev pages and their expected behaviour.

### Key caveats

- **No API key in dev by default.** Dashboard and other pages that query VitalSync will show "No data — set your VitalSync API key in dev/mock-data.js" until `window.__MOCK_API_KEY__` is set in `dev/mock-data.local.js`. The Customers List page falls back to mock data (3 sample rows) when no key is set, so it always renders something.
- **`npm run parse-schema`** regenerates `src/types/models.js`, `schema/schema-reference.json`, and updates the Schema Reference section in `CLAUDE.md`. Run it after any `schema/schema.xml` change.
- **Script load order matters.** Pages load JS in a specific order: `config.js → utils.js → vitalsync.js → domain.js → table.js → page controller`. Changing load order can break pages silently.
