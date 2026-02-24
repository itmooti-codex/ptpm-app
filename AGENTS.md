# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Vanilla JavaScript Ontraport app for Peter the Possum Man. No build step — JS/CSS are served raw. See `CLAUDE.md` for full project details, gotchas, and reference docs.

### Dev server

```bash
npm run dev
```

Starts Vite at **http://localhost:8000/dev/** (configured in `vite.config.js`). The `/dev/` directory contains mock HTML pages that simulate the Ontraport hosting environment.

### Available npm scripts

| Script | Command |
|--------|---------|
| `npm run dev` | Vite dev server on port 8000 |
| `npm run parse-schema` | Regenerate types from `schema/schema.xml` (requires the XML file to exist) |

### Lint / Test / Build

No lint, test, or build scripts are configured. There is no production build step — source files are deployed directly to GitHub Pages.

### Data layer

The app uses the VitalSync SDK loaded via CDN. To connect to live data, set `window.__MOCK_API_KEY__` in `dev/mock-data.js` or create `dev/mock-data.local.js` (gitignored). Without an API key, pages load their UI but show "No data" messages — this is expected for local development without credentials.

### Script load order

`config.js` → `utils.js` → `models.js` → `vitalsync.js` → `app.js` (see `CLAUDE.md` for details).
