# Master Feature Rollout Plan — VibeCodeApps Platform

## Context

VibeCodeApps builds custom apps for individual businesses. Each business gets their own deployed app. The platform needs to support **progressive feature enablement** — a client starts with basics (contact lookup + notifications) and adds dashboards, goal tracking, AI insights, voice assistant, etc. as their business grows.

**All AI features are branded as Buddzee** — the platform's AI business assistant. See `docs/features/buddzee-ai-assistant.md` for the full brand identity, voice guidelines, and integration checklist.

This plan merges three feature sources into one unified roadmap:
- **9 existing Buddzee-powered production features** (OneSignal, Buddzee Chat, Buddzee Dynamic Metrics, Buddzee Automation Engine, etc.)
- **Buddzee Dashboard Builder** (dashboards, widgets, KPIs, Buddzee AI insights)
- **Buddzee Voice & Vision Assistant Phases 2-6** (additional actions, lifecycle engine, role dashboards)

### Key Design Decisions

1. **Feature flags first** — every subsequent phase is gated behind flags. Non-negotiable for the per-client business model.
2. **Dynamic Metrics evolves, not replaced** — the existing 16-file system (`QueryConfig`, 7 aggregation types, `metric_definitions` table) becomes the foundation for the widget system.
3. **Goals are a specialized automation** — the existing Automation Engine's `create_automation` AI tool extends with a `goal_check` type rather than building a separate system.
4. **Voice/Vision Phase 6 dashboards merge with Buddzee dashboards** — one dashboard system, not two parallel implementations.
5. **OneSignal deep links extend naturally** — existing `{contactId, tab, subTab}` payload gains `dashboardId` + `widgetId` fields.

---

## Phase 0: Feature Flag Architecture (Foundation)

**Delivers:** Runtime feature toggling per app. Start simple, grow with the client.

**Builds on:** Current ad-hoc `VITE_*` env vars for feature toggles.

### What to Build

**A. Feature Registry (`src/lib/feature-flags.ts`)**
```
Two-tier system:
1. Build-time flags — VITE_FEATURE_* env vars (controls whether code is bundled)
2. Runtime flags — Database table + Zustand store (controls whether features render)
```

**B. Database Table: `app_features`**
```sql
CREATE TABLE app_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(64) NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  tier ENUM('basic','standard','premium') DEFAULT 'basic',
  config_json JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**C. Frontend Hook: `useFeature(key)`**
- Returns `{ enabled, config, tier }`
- Reads from Zustand store populated at app init via `GET /api/features`
- Components conditionally render based on flags

**D. Feature Manifest System**
- Each feature in `docs/features/` gets a companion `.manifest.json`
- Manifest lists: files, dependencies, env vars, DB tables, feature_key
- Scaffold scripts gain `--features` flag to pre-install features

### Feature Tiers (Example)

| Tier | Features Included |
|------|------------------|
| **Basic** | Contact lookup, push notifications, basic search |
| **Standard** | + AI Chat Agent, Dynamic Metrics, Social Feed, Automations |
| **Premium** | + Dashboards, Goal/KPI tracking, Voice Assistant, AI Insights, Lifecycle Engine |

### Key Files
- `src/lib/feature-flags.ts` — Feature registry, `useFeature()` hook, `FeatureGate` component
- `src/stores/featureStore.ts` — Zustand store for runtime flags
- `server/src/routes/features.ts` — `GET /api/features`, `PUT /api/features/:key`
- `server/src/lib/seed.ts` — Add `app_features` table + default rows
- `scripts/new-app.sh` / `scripts/new-mobile-app.sh` — Add `--features` flag

**Enables:** Every phase below is gated behind feature flags.

---

## Phase 1: Dashboard & Widget System (from Buddzee)

**Delivers:** Multi-dashboard tabs, 5 chart types, period filtering, data processing pipeline. Users get real, configurable analytics dashboards.

**Builds on:** Dynamic Metrics (QueryConfig, aggregation types, metric_definitions table), MUI X Charts Pro (already in stack), TanStack Query (auto-refresh), VitalSync SDK (data fetching + time variables).

### What to Build

**A. Dashboard Management**
- Multi-dashboard with tabs (MUI `Tabs`, scrollable variant)
- Create / rename / pin / unpin / soft-delete dashboards
- Per-dashboard date range context (stored as dashboard variable overrides)
- DB: `dashboards` table (id, user_id, name, configuration JSON, sort_order, is_pinned, deleted_at)

**B. Widget System**
- 6 widget types: **line, bar, area, gauge, number, table**
- Each widget is self-contained: fetches its own data, processes, renders
- Widget config stored as JSON (data source PUID, axes, aggregation, formatting, goals, refresh)
- DB: `widgets` table (id, dashboard_id, user_id, name, chart_type, configuration JSON, sort_order, col_span)
- Widgets wrap MUI X Charts Pro components (thin wrappers with consistent API)

**C. Period Management & Date Filtering**
- Global period picker in dashboard header (Today / 7D / 30D / MTD / YTD / Custom)
- MUI `ToggleButtonGroup` for presets + `DateRangePicker` for custom
- Injects `X_DAY_BEGIN` / `X_DAY_END` time variables into all widget queries
- Stored in dashboard Zustand slice

**D. Data Processing Pipeline**
- `src/utils/data-processing.ts` — pure functions
- `detectAxes()` — auto-detect date X axis + numeric Y axes
- `aggregate()` — roll up by day/week/month/quarter/year, 7 methods (sum, mean, median, min, max, first, last)
- `fillDateGaps()` — insert zero-value rows for missing dates
- `calculateTrendline()` — linear regression
- `formatValue()` — number formatting engine (currency/percent/compact via `Intl.NumberFormat`)

**E. Auto-Refresh**
- Per-widget `refetchInterval` via TanStack Query (already in stack)
- Manual refresh: per-widget button + "refresh all" dashboard action

**F. Drag & Drop Widget Ordering**
- `@dnd-kit/core` + `@dnd-kit/sortable`
- Update `sort_order` via VitalSync mutation on drop

### Key Files to Create
```
src/
  features/dashboard/
    DashboardTabs.tsx          — Tab bar with pin/unpin context menu
    DashboardHeader.tsx        — Period picker + refresh all + dashboard settings
    WidgetGrid.tsx             — Sortable grid container (@dnd-kit)
    PeriodPicker.tsx           — Preset toggles + custom date range
    widgets/
      ChartWidget.tsx          — Container card (header, chart, footer)
      WidgetHeader.tsx         — Name, refresh, settings, AI insight toggle
      LineChart.tsx            — MUI X Charts Pro wrapper
      BarChart.tsx             — MUI X Charts Pro wrapper
      AreaChart.tsx            — MUI X Charts Pro wrapper
      GaugeWidget.tsx          — MUI X Gauge with custom center label
      NumberWidget.tsx         — Big number + delta + sparkline
    dialogs/
      AddWidgetDialog.tsx      — Step wizard: data source → chart type → configure
      WidgetSettingsDialog.tsx  — Edit widget config
      DashboardManagerDialog.tsx — Create/rename/delete/reorder dashboards
    hooks/
      useDashboard.ts          — Dashboard CRUD + active dashboard state
      useWidgetData.ts         — Fetch + process pipeline per widget
    stores/
      dashboardStore.ts        — Zustand: dashboards[], activeDashboardId, dateRange
    utils/
      data-processing.ts       — Aggregation, gap-fill, trendline, axis detection
      formatting.ts            — Number formatting engine (Intl.NumberFormat)
      period-presets.ts        — Period offset calculations
    types.ts                   — Dashboard, Widget, WidgetConfig, ProcessedData interfaces
```

**Feature flag:** `dashboard-system`

---

## Phase 2: Goal & KPI Tracking + Smart Notifications

**Delivers:** Goal targets on charts, forecasting badges, AI conversational goal setup ("notify me at 3pm if we miss target"), push notifications with deep links to dashboards. This is the killer feature.

**Builds on:** Phase 1 (dashboards/widgets), Automation Engine (scheduled n8n workflows, condition evaluator, AI tools), OneSignal (deep linking), AI Chat Agent (conversational tool execution).

### What to Build

**A. KPI Definitions & Management**
- DB: `kpi_definitions` table (id, name, description, owner_user_id, parent_kpi_id, rollup_method, configuration JSON)
- DB: `kpi_widget_links` table (kpi_definition_id, widget_id)
- KPI config JSON: goalType (fixed/linear/seasonal), annualTarget, periodStart/End, seasonalWeights, forecast thresholds, conditional colors
- KPI Manager dialog for CRUD

**B. Goal Processing Engine**
- `src/utils/goal-processing.ts` — pure functions:
  - `generateDailyTargets()` — daily target vector from annual goal + distribution type
  - `calculateForecast()` — linear regression on actuals to predict end-of-period
  - `calculateVelocity()` — current rate vs required rate
  - `assessConfidence()` — safe (>90%) / risk (70-90%) / critical (<70%)
  - `getGoalForPeriod()` — slice daily targets for current dashboard date range
- Goal overlay on MUI X Charts via `referenceLinePlugin` (built-in)
- Gauge widget: value vs target with delta indicator
- Forecast badge on widget header ("On Track" / "At Risk" / "Critical")

**C. Goal Notification Automation (n8n + OneSignal)**

This is the "notify me at 3pm if we hit target" flow. It works by extending the existing Automation Engine:

```
User in AI Chat: "Notify me at 3pm every day if we haven't hit $10K in sales"
  → AI Chat Agent calls existing create_automation tool (extended with goal_check type)
  → Creates automation_rule in DB:
      type: 'goal_check'
      schedule: '0 15 * * *' (3pm daily)
      condition: { metric: 'daily_revenue', operator: 'lt', threshold: 10000 }
      action: { type: 'push_notification', title: 'Sales Target Alert', deepLink: { dashboardId: 5 } }
  → Creates n8n scheduled workflow via existing n8n-client:
      Schedule Trigger (3pm) → VitalSync GraphQL query (with X_DAY_BEGIN time var)
      → Code node evaluates condition → OneSignal Push API → deep link payload
  → Activates workflow
```

**D. OneSignal Deep Link Extension**
- Extend push notification payload: add `dashboardId` and `widgetId` fields
- Extend `useDeepLinkListener` hook to handle dashboard navigation
- When user taps notification → app opens → navigates to specific dashboard

**E. New AI Chat Tool: `setup_goal_notification`**
- Added to the AI Chat Agent's tool registry
- Takes natural language goal description, parses into: metric, threshold, schedule, notification preferences
- Calls `create_automation` internally with `goal_check` type
- Conversational flow: "What metric?" → "What's your target?" → "When should I check?" → "Created! You'll get a push notification."

### Key Files to Create/Modify
```
NEW:
  src/features/dashboard/kpi/
    KpiManager.tsx             — CRUD dialog for KPI definitions
    GoalOverlay.tsx            — Reference line integration for charts
    ForecastBadge.tsx          — On Track / At Risk / Critical chip
    GaugeGoalWidget.tsx        — Gauge with goal target + delta
  src/features/dashboard/utils/
    goal-processing.ts         — Daily targets, forecast, velocity, confidence
  server/src/lib/tools/goal-tools.ts  — setup_goal_notification AI tool

MODIFY:
  server/src/lib/tools/ (automation tools) — Add goal_check automation type
  server/src/routes/assistant.ts or chat.ts — Register new goal tool
  src/hooks/useDeepLinkListener.ts — Add dashboardId/widgetId navigation
  OneSignal notification payload — Add dashboard deep link fields
```

**Feature flag:** `goal-kpi-tracking`

---

## Phase 3: AI-Powered Insights + Widget Library

**Delivers:** Per-widget AI analysis ("so what?"), dashboard summary, pre-built widget templates for quick setup.

**Builds on:** Phase 1 (widgets), AI Chat Agent (n8n → Claude), n8n workflow builder.

### What to Build

**A. Per-Widget AI Insights**
- "Insight" button on each widget header
- Sends widget data (last N data points) + context to n8n webhook
- n8n AI agent (Claude) returns 3-sentence business analysis
- Displayed in collapsible panel below chart
- n8n workflow: Webhook → Claude with analytics system prompt → structured response

**B. Dashboard Summary**
- "Summarize" button in dashboard header
- Collects summary stats from all widgets (name, type, latest value, trend, % change)
- Sends to n8n webhook → Claude finds cross-metric patterns
- Returns 1-paragraph summary in dialog/banner

**C. Widget Library & Templates**
- `is_template` flag on widgets table (already in Phase 1 schema)
- Widget Library dialog: browse pre-configured templates with previews
- "Add to Dashboard" clones template into widget instance
- "Save to Library" saves current widget as template
- Admin creates templates; all users can browse and add

### Key Files to Create
```
src/features/dashboard/
  ai/
    WidgetInsight.tsx          — Collapsible insight panel per widget
    DashboardSummary.tsx       — Summary dialog/banner
  library/
    WidgetLibrary.tsx          — Browse + add template widgets
    WidgetTemplateCard.tsx     — Preview card for library items

n8n workflows (via n8n-builder):
  widget-insight.json          — Per-widget analysis workflow
  dashboard-summary.json       — Cross-metric pattern analysis workflow
```

**Feature flag:** `ai-insights`, `widget-library`

---

## Phase 4: Voice & Vision Assistant — Phase 2 Actions

**Delivers:** 16 additional voice/camera actions beyond the 4 in Phase 1. Quoting, email drafting, scheduling, receipt scanning, inventory — the full action library.

**Builds on:** Voice & Vision Phase 1 (action registry, AI processor, confirmation UI).

### What to Build (Priority Order)

**High Priority (most client value):**
1. `create-quote` — Voice-driven quoting with line items
2. `draft-email` — AI-drafted emails from voice/text input
3. `create-appointment` — Schedule appointments via voice
4. `create-task` / `create-follow-up` — Task/reminder creation
5. `scan-receipt` — Photo → expense record with GST extraction

**Medium Priority:**
6. `log-interaction` — Log calls/meetings/visits
7. `voice-memo` — Quick capture, AI-summarized
8. `create-invoice` — Invoice from voice or from existing quote
9. `draft-sms` — Quick text message drafting

**Lower Priority (industry-specific):**
10. `scan-id-document` — Extract from driver's licence/ID
11. `document-site` — Photo + voice job site documentation
12. `dictate-report` — Form/report dictation
13. `scan-barcode` / `stock-check` / `log-material-usage` — Inventory actions
14. `generate-summary-email` — Meeting transcript → email

**Each action is a self-contained module** following the existing pattern in `server/src/lib/actions/`. No architectural changes needed — just new action files registered in the registry.

**Feature flag:** `assistant-actions-extended`

---

## Phase 5: Voice-Driven Dashboard Metrics + Role Defaults

**Delivers:** Users talk to the assistant and a metric appears on their dashboard. Role-based default dashboard configurations. This merges Voice/Vision Phase 6 with Buddzee dashboards.

**Builds on:** Phase 1 (dashboards/widgets), Phase 4 (voice assistant), Dynamic Metrics (English → QueryConfig → GraphQL).

### What to Build

**A. `add-dashboard-metric` Action**
- New voice assistant action: "Show me revenue this month broken down by week"
- Leverages existing Dynamic Metrics AI query generation (English → QueryConfig)
- Result is a widget added to the user's active dashboard
- Conversational refinement: "Make it a bar chart" → "Compare to last month" → "Set target of $50K"

**B. Role-Based Dashboard Defaults**
- Default metric/widget configs per role stored in `app_features` config_json
- On first login, user gets pre-populated dashboard based on their role
- Roles: Sales, Service Tech, Office Admin, Business Owner, Project Manager
- Each role gets 4-6 default widgets tuned to their KPIs
- Users can customize from there (add/remove/reorder)

**C. Dashboard Action Items Section**
- Section on dashboard showing lifecycle-driven action items (if Phase 6 is built)
- Or simpler: shows overdue goals, automation alerts, pending tasks
- Quick-action buttons wire into voice assistant action registry

### Key Files to Create
```
server/src/lib/actions/add-dashboard-metric.ts  — New voice assistant action
src/features/dashboard/
  RoleDefaults.tsx             — First-login role selection + default dashboard setup
  ActionItemsSection.tsx       — Dashboard section for urgent items
  defaults/
    sales-defaults.ts          — Default widgets for Sales role
    admin-defaults.ts          — Default widgets for Office Admin role
    owner-defaults.ts          — Default widgets for Business Owner role
```

**Feature flag:** `voice-dashboard-metrics`, `role-dashboards`

---

## Phase 6: Predictive Lifecycle Engine (Optional — High Complexity)

**Delivers:** The system knows where every contact is in their journey, what typically happens next, and tells the user what to do (with a personalized script).

**Builds on:** Phase 2 (goals/KPIs), Automation Engine (n8n workflows), VitalSync SDK (field-change history queries).

### What to Build

**A. Lifecycle Snapshot Calculation**
- Query contact's full field-change history via VitalSync
- Build lifecycle position: current stage, time in stage, velocity trend, engagement signals, churn risk

**B. Cohort Pattern Analysis**
- Aggregate queries across all contacts in similar positions
- Find: what did they do next? What business actions correlated with success/failure?

**C. Next-Best-Action Generation**
- Claude with full lifecycle + cohort context generates personalized recommendations
- Talk tracks: suggested messages adapted to contact's history, tone, and channel

**D. n8n Pipelines**
- `lifecycle-trigger.json` — Webhook-triggered: single contact recalculation on field change
- `lifecycle-sweep.json` — Daily 6am: batch recalculation for stale/inactive contacts
- `lifecycle-refresh.json` — Manual: immediate single-contact refresh from app

**E. Frontend Components**
```
src/features/dashboard/lifecycle/
  LifecyclePromptCard.tsx      — "Next Step" prompt on contact detail
  LifecycleInsightBadge.tsx    — Compact badge for list views
  LifecycleDashboard.tsx       — Urgent actions, at-risk contacts, stuck pipeline
  lifecycle-types.ts           — Snapshot, CohortAnalysis, NextBestAction interfaces
  parse-lifecycle-fields.ts    — Parse ai_next_action JSON from contact record
```

**Feature flag:** `lifecycle-engine`

---

## Phase 7: 1Brain Knowledge Integration (Optional — Future)

**Delivers:** AI assistant knows the business's SOPs, policies, playbooks. Coaches users through processes, not just actions.

**Builds on:** All previous phases, especially AI Chat Agent and Lifecycle Engine.

### What to Build
- `server/src/services/onebrain.ts` — 1Brain API integration (search, getRelevantDocs, getRole)
- Role-based context injection into all Claude prompts
- SOP/policy retrieval for action-specific guidance
- Playbook-enhanced talk tracks in lifecycle prompts

**Feature flag:** `onebrain-integration`

---

## Phases NOT Built (Deprioritized)

| Feature | Reason |
|---------|--------|
| Multi-tenant account architecture | Each business gets own app — not needed |
| Custom Chart Builder (AI code gen) | Security risk, MUI X Charts Pro covers 95% of needs |
| Voice & Vision Phase 3 (conversation mode) | High complexity (Deepgram/Whisper), limited initial value |
| Voice & Vision Phase 4 (speaker diarization, offline) | Very advanced, defer until clear demand |
| Buddzee custom chart WebView sandbox | Replaced by chart configurator wizard approach |

---

## Implementation Summary

| Phase | Feature Flag Key | Builds On | Est. Effort |
|-------|-----------------|-----------|-------------|
| **0: Feature Flags** | (foundation) | Existing env vars | 2-3 days |
| **1: Dashboards & Widgets** | `dashboard-system` | Dynamic Metrics, MUI X Charts Pro | 1-2 weeks |
| **2: Goals & Smart Notifications** | `goal-kpi-tracking` | Phase 1, Automation Engine, OneSignal, AI Chat | 1-2 weeks |
| **3: AI Insights & Widget Library** | `ai-insights`, `widget-library` | Phase 1, n8n AI agent | 3-5 days |
| **4: Voice Actions Extended** | `assistant-actions-extended` | Voice/Vision Phase 1 | 1 week |
| **5: Voice Dashboards & Roles** | `voice-dashboard-metrics`, `role-dashboards` | Phases 1+4, Dynamic Metrics | 3-5 days |
| **6: Lifecycle Engine** | `lifecycle-engine` | Phase 2, n8n, VitalSync | 2-3 weeks |
| **7: 1Brain** | `onebrain-integration` | All phases | TBD |

## End-to-End Flow: "Notify me at 3pm if we miss target"

```
1. User opens AI Chat (existing feature)
2. Types: "I want to know at 3pm every day if we've hit our sales target"
3. AI Chat Agent calls setup_goal_notification tool:
   a. Parses: metric=daily_revenue, threshold=$10K, schedule=15:00 daily, direction=below
   b. Creates kpi_definition (if not exists) via DB
   c. Calls create_automation (existing tool, extended):
      - Type: goal_check
      - Schedule: cron '0 15 * * *'
      - Condition: { metric: 'daily_revenue', operator: 'lt', threshold: 10000 }
      - Action: { push_notification, title: 'Sales Target Alert', deepLink: { dashboardId } }
   d. Builds n8n scheduled workflow via n8n-client (existing):
      - Schedule Trigger (3pm) → HTTP Request (VitalSync GraphQL, X_DAY_BEGIN=0)
      - → Code node (evaluate: revenue < 10000?) → OneSignal REST API push
   e. Activates workflow
4. AI responds: "Done! You'll get a push notification every day at 3pm if daily revenue is below $10K."
5. At 3pm, n8n fires → checks VitalSync → revenue is $7,200 → sends push
6. User's phone: "Sales Target Alert — Daily revenue is $7,200 ($2,800 below target)"
7. User taps notification → app opens → navigates to Sales dashboard
```

## Verification Plan

**Phase 0:** Create feature flag for an existing feature (e.g., AI Chat), toggle it off, verify component doesn't render. Toggle on, verify it works.

**Phase 1:** Create a dashboard with 3 widgets (line, bar, gauge), change period filter, verify all charts update. Drag to reorder, verify order persists.

**Phase 2:** Create a KPI via the manager, link to a widget, verify goal line appears. Use AI Chat to set up a 3pm notification, verify n8n workflow is created and activated. Trigger manually, verify push arrives with deep link.

**Phase 3:** Click "Insight" on a widget, verify AI analysis appears. Save widget as template, browse library, add to different dashboard.

**Phase 4:** Test each new action via voice/text — verify extraction, confirmation card, and VitalSync mutation.

**Phase 5:** Say "Show me revenue this month" via voice assistant, verify widget appears on dashboard. Login as new user with "Sales" role, verify default dashboard loads.
