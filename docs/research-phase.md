# Research Phase — Business Intelligence Collection

The research phase automatically collects business intelligence from a client's VitalStats and Ontraport APIs before any features are planned. This ensures the app is built with a deep understanding of how the business operates.

## Research Script

```bash
node scripts/research.cjs \
  --slug clientslug \
  --api-key "VITALSYNC_API_KEY" \
  --datasource-id "base64_datasource_id" \
  --target ../app-name \
  [--skip-ontraport] \
  [--skip-website] \
  [--verbose]
```

Only 3 credentials needed — all from VitalStats (no direct Ontraport API keys required for reads).

## Data Collectors

| Collector | What It Collects | API |
|-----------|-----------------|-----|
| `business-profile` | Company name, logo, address, website, branding | Ontraport REST |
| `object-discovery` | All objects via `CustomObjects` + `getInfo` (counts, listFields, sums, widgets) | Ontraport REST |
| `groups` | All Ontraport Groups with filter criteria + SDK query equivalents | Ontraport REST |
| `field-metadata` | Field definitions, ID→alias mapping, **dropdown colors** (color + backgroundColor per option) | Ontraport REST |
| `record-counts` | Supplemental counts via GraphQL `calc` queries | VitalStats GraphQL |
| `sample-data` | 5 recent records from each active model | VitalStats GraphQL |
| `automation-logs` | AutomationLogEntry + ObjectLogEntry records, aggregated by type/channel | VitalStats GraphQL |
| `field-distributions` | Enum field value counts (which statuses are actually used) | VitalStats GraphQL |
| `sync-gap-analysis` | Ontraport objects/fields NOT synced to VitalStats schema | Cross-reference (no API) |
| `website-snapshot` | Business website pages — titles, headings, services, messaging | HTTP fetch |

## Research Output Structure

```
../app-name/research/
├── raw/                              # Gitignored — contains PII
│   ├── business-profile.json
│   ├── object-discovery.json
│   ├── record-counts.json
│   ├── sample-{model}.json
│   ├── automation-logs.json
│   ├── groups.json
│   ├── field-metadata.json
│   ├── field-distributions.json
│   ├── sync-gap-analysis.json
│   └── website-snapshot.json
├── knowledge-base.md                # Synthesized findings (committed, no PII)
└── research-config.json             # What was collected, timestamps
```

## Knowledge Base Contents

The generated `research/knowledge-base.md` includes:
- **Business Profile** — company info, branding, website summary
- **Data Overview** — models ranked by record count, empty/unused models
- **Business Process Map** — automation patterns, communication channels (SMS/email/phone)
- **Segmentation** — Ontraport Groups organized by object type with SDK query equivalents
- **Field Importance** — listFields priorities, KPI fields (sums)
- **Status Field Colors** — exact hex color + backgroundColor for every dropdown option (replaces generic `getStatusColor()`)
- **Sync Gaps** — objects/fields in Ontraport but NOT in VitalStats (must be synced before the app can use them)
- **Field Distributions** — enum value counts showing which statuses are actually used

## GraphQL Query Patterns for Research

**AutomationLogEntry queries** use `object_type_id` to filter by Ontraport object (0=Contacts):
```graphql
query calcAutomationLogEntries($limit: IntScalar) {
  calcAutomationLogEntries(
    query: [{ where: { object_type_id: 0 } }]
    limit: $limit
    orderBy: [{ path: ["Timestamp"], type: desc }]
  ) {
    Timestamp: field(arg: ["_ts_"])
    Type: field(arg: ["type"])
    Description: field(arg: ["description"])
  }
}
```

**ObjectLogEntry queries** (communication/activity logs) — count first, then fetch:
```graphql
query calcObjectLogEntries($limit: IntScalar) {
  calcObjectLogEntries(
    query: [{ where: { object_type_id: 0 } }]
    limit: $limit
    orderBy: [{ path: ["Time"], type: desc }]
  ) {
    Timestamp: field(arg: ["_ts_"])
    Type: field(arg: ["type"])
    Status: field(arg: ["status"])
    Subject: field(arg: ["Message", "subject"])
  }
}
```

**Per-contact ObjectLogEntry query** (for app features, not research):
```graphql
query calcObjectLogEntries(
  $Contact_id: PhyxContactID!
  $limit: IntScalar
  $offset: IntScalar
) {
  calcObjectLogEntries(
    query: [{ where: { Contact_id: $Contact_id } }]
    limit: $limit
    offset: $offset
    orderBy: [{ path: ["Time"], type: desc }]
  ) {
    ID: field(arg: ["id"])
    Details: field(arg: ["details"])
    Subject: field(arg: ["Message", "subject"])
    MessageBody: field(arg: ["Message", "message_body"])
    Status: field(arg: ["status"])
    CreatedAt: field(arg: ["ObjectLogEntryItems", "created_at"])
  }
}
```

## Dropdown Field Color Extraction

The field-metadata collector fetches exact colors for every dropdown field option via `{ObjectName}/fieldeditor?field={fieldId}`. Each option includes:
- `label` — display text
- `color` — text hex color (e.g., `#43a047`)
- `backgroundColor` — background hex color (e.g., `#d9ecda`)

These map directly to MUI `<Chip sx={{ color, backgroundColor }}>` — no keyword-matching guesswork needed. The knowledge base outputs these as ready-to-use color tables.
