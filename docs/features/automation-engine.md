# Buddzee Automation Engine (VitalSync + n8n)

> Buddzee's automation system lets users create scheduled and real-time automations via natural language. Buddzee creates the full end-to-end pipeline: database rule, n8n workflow, and (for real-time) a server-side VitalSync WebSocket subscription. See `buddzee-ai-assistant.md` for Buddzee's brand identity.

## Architecture

```
User to Buddzee: "Email me whenever a new order comes in"
  → Buddzee calls create_automation tool
  → Server: DB insert + n8n webhook workflow created + WS subscription registered
  → VitalSync sends change event via WebSocket
  → SubscriptionManager evaluates condition
  → Fires n8n webhook → n8n workflow → email sent

User to Buddzee: "Every morning at 8am, tell me today's revenue"
  → Buddzee calls create_automation tool (with aggregation config)
  → Server: DB insert + n8n scheduled workflow created
  → n8n Schedule Trigger fires at 8am
  → HTTP Request queries VitalSync GraphQL (using time variables)
  → Code node evaluates condition → email sent
```

Two automation types:
- **Real-time** — Server-side VitalSync WebSocket subscriptions. Fires instantly when data changes.
- **Scheduled** — n8n cron workflows that poll VitalSync at intervals. Supports both record-fetch and aggregation queries.

## Files (10 files)

### Backend (server/)

| File | Purpose |
|------|---------|
| `server/src/services/subscription-manager.ts` | **Core** — VitalSync WebSocket connection manager. One WS per model, multiple rules share connections. Evaluates conditions, fires n8n webhooks. |
| `server/src/lib/condition-evaluator.ts` | **Core** — Pure function `evaluateCondition()`. Three shapes: simple (`field/operator/value`), event (`any_change`, `field_changed`), compound (`and`/`or`). |
| `server/src/lib/tools/automation-tools.ts` | **Core** — 5 AI tools: `create_automation`, `list_automations`, `toggle_automation`, `delete_automation`, `get_automation_log`. Builds n8n workflows programmatically. |
| `server/src/routes/automations.ts` | REST API for frontend (list, toggle, logs, delete). Behind auth middleware. |
| `server/src/seed.ts` | `automation_rules` + `automation_log` table schemas |
| `server/src/index.ts` | Import routes, initialize SubscriptionManager on startup, graceful shutdown |
| `server/src/lib/tool-registry.ts` | Register `automationTools` in `serverTools` array |
| `server/src/routes/ai.ts` | System prompt section for automation engine guidance |

### Frontend (src/)

| File | Purpose |
|------|---------|
| `src/features/ai/store/useAiStore.ts` | Tool status labels for 5 automation tools |
| `src/features/ai/components/ToolRenderer.tsx` | Render automation results (created/list/toggled/log) |

## Dependencies

```bash
cd server && npm install ws && npm install -D @types/ws
```

Also requires:
- **n8n-client.ts** — existing n8n API client (createWorkflow, activateWorkflow, etc.)
- **settings.ts** — existing `getN8nConfig()` for n8n API URL/key
- **schema-context.ts** — existing `getRootFieldMap()` for GraphQL root field names

## Environment Variables

```env
# Already exist in a typical React+Mobile app
VITALSYNC_API_KEY=...           # For WebSocket subscriptions + GraphQL validation
VITALSYNC_SLUG=...              # VitalSync account slug
# Already exist if n8n tools are set up
# n8n config stored in app_settings table (encrypted)
```

No new env vars required — uses existing VitalSync and n8n configuration.

## Database Tables

```sql
-- Automation rules (both scheduled and real-time)
CREATE TABLE IF NOT EXISTS automation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  type ENUM('scheduled', 'realtime') NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vs_model VARCHAR(100) NOT NULL,
  vs_fields JSON NOT NULL,
  condition_config JSON NOT NULL,
  n8n_workflow_id VARCHAR(50) DEFAULT NULL,
  n8n_webhook_path VARCHAR(255) DEFAULT NULL,
  n8n_cron_expression VARCHAR(100) DEFAULT NULL,
  created_by INT NOT NULL,
  last_triggered_at TIMESTAMP NULL DEFAULT NULL,
  trigger_count INT NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE CASCADE,
  INDEX idx_type_enabled (type, is_enabled),
  INDEX idx_model (vs_model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trigger audit log
CREATE TABLE IF NOT EXISTS automation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT NOT NULL,
  trigger_data JSON DEFAULT NULL,
  webhook_status INT DEFAULT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE,
  INDEX idx_rule_created (rule_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**IMPORTANT**: After adding to seed.ts, also create tables on production via SSH + docker exec.

## Implementation Steps

### 1. Install dependencies
```bash
cd server && npm install ws && npm install -D @types/ws
```

### 2. Add database tables
Add the two CREATE TABLE statements to `server/src/seed.ts`. Run seed locally. Create on production.

### 3. Create condition-evaluator.ts
Copy `server/src/lib/condition-evaluator.ts`. Pure function, no external dependencies.

Three condition shapes:
- **Simple**: `{ field: "status", operator: "eq", value: "Paid" }`
- **Event**: `{ event: "any_change" }` or `{ event: "field_changed", field: "status", then?: { ... } }`
- **Compound**: `{ logic: "and", conditions: [...] }`

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `in`, `is_null`, `is_not_null`

### 4. Create subscription-manager.ts
Copy `server/src/services/subscription-manager.ts`. Adapt constants for the target app:
- `VITALSYNC_SLUG` — from env
- `VITALSYNC_API_KEY` — from env
- Imports `getRootFieldMap()` from `schema-context.ts` for GraphQL root field mapping

Key architecture:
- **One WebSocket per model** — multiple rules watching the same model share one connection
- **VitalSync protocol**: `wss://{slug}.vitalstats.app/api/v1/graphql?apiKey={key}`, subprotocol `"vitalstats"`
- **Lifecycle**: `CONNECTION_INIT` → `CONNECTION_ACK` → `GQL_START` → `GQL_DATA` events
- **First GQL_DATA is a full snapshot** — skip it, only process subsequent change events
- **Keep-alive**: Send `KEEP_ALIVE` every 80 seconds
- **Reconnect**: Exponential backoff (1s → 2s → 4s → ... → 30s max)
- **Subscription queries use rootField + `field(arg:)` syntax**: `subscription { calcPurchases { id: field(arg: ["id"]) amount: field(arg: ["amount"]) } }`
- **Root field mapping** comes from `schema-context.ts` `getRootFieldMap()` (e.g. `Purchase` → `calcPurchases`)

### 5. Create automation-tools.ts
Copy `server/src/lib/tools/automation-tools.ts`. Adapt:
- `VITALSYNC_SLUG`, `VITALSYNC_API_KEY`, `GRAPHQL_URL` constants
- n8n workflow naming prefix (e.g. `"PHYX Auto:"`)
- VitalSync model enum in `create_automation` tool schema

The file contains:
- **`buildRealtimeWorkflowNodes()`** — Creates n8n Webhook → Code → Action workflow
- **`buildScheduledQuery()`** — Builds GraphQL record-fetch query
- **`buildAggQuery()`** — Builds aggregation query with VitalSync time variables
- **`buildAggregationWorkflowNodes()`** — Creates Schedule → parallel HTTP Requests → Merge → IF → Action
- **`buildScheduledWorkflowNodes()`** — Creates Schedule → HTTP Request → Code → IF → Action
- **5 tool definitions** with execute functions

### 6. Create automations.ts route
Copy `server/src/routes/automations.ts`. REST API for frontend:
```
GET    /api/automations              → list all rules for current user
GET    /api/automations/:id/log      → trigger history
PATCH  /api/automations/:id          → toggle enabled/disabled
DELETE /api/automations/:id          → delete rule
```

### 7. Register tools
In `tool-registry.ts`:
```typescript
import { automationTools } from './tools/automation-tools';
// In serverTools array:
...automationTools,
```

### 8. Wire up server startup/shutdown
In `server/src/index.ts`:
```typescript
import { subscriptionManager } from './services/subscription-manager';
import automationsRoutes from './routes/automations';

app.use('/api/automations', automationsRoutes);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`API server running on port ${PORT}`);
  try {
    await subscriptionManager.initialize();
  } catch (err) {
    console.error('Subscription manager failed to start:', err);
  }
});

process.on('SIGTERM', () => subscriptionManager.shutdown());
process.on('SIGINT', () => subscriptionManager.shutdown());
```

### 9. Add system prompt section
In `routes/ai.ts` `buildSystemPrompt()`, add guidance for:
- When to use scheduled vs realtime
- Condition format reference
- Operator reference
- VitalSync time variable reference (`X_DAY_BEGIN`, `X_MONTH_BEGIN`, etc.)
- Action types (email, webhook)
- Model reference (from schema)

### 10. Frontend tool integration
- Add tool status labels to AI store
- Add result rendering to ToolRenderer

## Condition Evaluator Reference

### Simple Condition
```json
{ "field": "status", "operator": "eq", "value": "Paid" }
```

### Event Condition (real-time only)
```json
{ "event": "any_change" }
{ "event": "field_changed", "field": "status" }
{ "event": "field_changed", "field": "status", "then": { "field": "status", "operator": "eq", "value": "Paid" } }
```

### Compound Condition
```json
{
  "logic": "and",
  "conditions": [
    { "field": "status", "operator": "eq", "value": "Paid" },
    { "field": "total_purchase", "operator": "gt", "value": 500 }
  ]
}
```

## Aggregation Queries (Scheduled)

For summary/report automations that need totals, counts, or comparisons:

```json
{
  "aggregation": {
    "queries": [
      {
        "label": "Today Revenue",
        "agg_type": "sum",
        "agg_field": "total_purchase",
        "filters": [
          { "field": "created_at", "operator": "gte", "time_var": "X_DAY_BEGIN", "time_offset": 0 },
          { "field": "status", "operator": "eq", "value": "Paid" }
        ]
      },
      {
        "label": "Yesterday Revenue",
        "agg_type": "sum",
        "agg_field": "total_purchase",
        "filters": [
          { "field": "created_at", "operator": "gte", "time_var": "X_DAY_BEGIN", "time_offset": -1 },
          { "field": "created_at", "operator": "lt", "time_var": "X_DAY_END", "time_offset": -1 },
          { "field": "status", "operator": "eq", "value": "Paid" }
        ]
      }
    ]
  }
}
```

### VitalSync Time Variables
| Variable | Description |
|----------|-------------|
| `X_DAY_BEGIN` / `X_DAY_END` | Start/end of day |
| `X_WEEK_BEGIN` / `X_WEEK_END` | Start/end of week |
| `X_MONTH_BEGIN` / `X_MONTH_END` | Start/end of month |
| `X_YEAR_BEGIN` / `X_YEAR_END` | Start/end of year |

Offset: `0` = current period, `-1` = previous, `-2` = two periods ago.

Variables are declared as `$X_VAR: TimestampSecondsScalar!` and passed as `{ "X_VAR": 0 }` in the variables object.

## VitalSync GraphQL Query Syntax

**CRITICAL**: VitalSync uses a specific query filter syntax that differs from standard GraphQL.

### Correct format
```graphql
query calcPurchases($X_DAY_BEGIN: TimestampSecondsScalar!) {
  calcPurchases(
    query: [
      { where: { created_at: $X_DAY_BEGIN, _OPERATOR_: gte } },
      { andWhere: { status: "Paid", _OPERATOR_: eq } }
    ],
    limit: 1
  ) {
    sum(args: [{ field: ["total_purchase"] }])
  }
}
```

Variables: `{ "X_DAY_BEGIN": 0 }`

### Key rules
- Use `query: [{ where: ... }, { andWhere: ... }]` — NOT `where: { field: { op: value } }`
- First filter uses `where`, subsequent use `andWhere`
- ALWAYS use time variables for date filtering — NEVER hardcode Unix timestamps
- Aggregation result is an array with one element: `[{ "result": 17813 }]`

## Webhook Payload (sent to n8n)

Real-time automations POST this payload to the n8n webhook:

```json
{
  "automationId": 1,
  "automationName": "New Order Alert",
  "model": "Purchase",
  "record": { "id": "123", "amount": 599, "status": "Paid" },
  "triggeredAt": "2026-02-10T10:30:00Z"
}
```

## Prerequisites

This feature requires:
1. **n8n Workflow Builder AI tools** — the existing `n8n-client.ts`, `settings.ts`, and n8n tools (`configure_n8n`, `create_n8n_workflow`, etc.)
2. **VitalSync schema** — `schema-context.ts` with `getRootFieldMap()` for GraphQL root field mapping
3. **Express backend** with MySQL, JWT auth, and AI chat system

## Gotchas & Lessons Learned

1. **VitalSync subscription format**: Subscriptions use `rootField` names (e.g. `calcPurchases`) with `field(arg: [...])` syntax for field selection — same as read queries. The root field mapping comes from `schema-context.ts` `getRootFieldMap()`. Example: `subscription { calcPurchases { id: field(arg: ["id"]) status: field(arg: ["status"]) } }`

2. **First GQL_DATA is a full snapshot**: The first data message after subscribing contains ALL records, not a change event. Must skip it and only process subsequent messages.

3. **VitalSync query syntax**: Uses `query: [{ where/andWhere }]` — NOT standard GraphQL `where` clause. Time variables (`X_DAY_BEGIN`, etc.) avoid hardcoding timestamps.

4. **New DB tables must be created on production**: `seed.ts` only runs locally. After adding tables, manually CREATE them on production via SSH + docker exec.

5. **deploy.yml must include all env vars**: The GitHub Actions deploy writes `.env` from scratch on every push. Any manually-added env vars get wiped. Always add new vars to deploy.yml.

6. **Gmail credentials**: n8n email action nodes need Gmail OAuth2 credentials connected manually in the n8n editor after workflow creation.

7. **Keep-alive is critical**: VitalSync WebSocket connections drop if no heartbeat is sent within ~90 seconds. The SubscriptionManager sends `KEEP_ALIVE` every 80 seconds.

## User-Facing Flow Examples

### Real-time
```
User: "Email me whenever a new purchase comes in"
AI:   create_automation(type="realtime", vs_model="Purchase",
      condition={event:"any_change"}, action_type="email",
      action_config={to:"admin@company.com"})
→ DB rule created
→ n8n webhook workflow created + activated
→ WebSocket subscription registered
→ "Created 'New Purchase Alert'. Watching for purchases in real-time."
```

### Scheduled with aggregation
```
User: "Every morning at 8am, email me today's revenue vs yesterday"
AI:   create_automation(type="scheduled", cron="0 8 * * *",
      vs_model="Purchase", aggregation={queries:[
        {label:"Today",agg_type:"sum",agg_field:"total_purchase",
         filters:[{field:"created_at",operator:"gte",time_var:"X_DAY_BEGIN",time_offset:0},
                  {field:"status",operator:"eq",value:"Paid"}]},
        {label:"Yesterday",agg_type:"sum",agg_field:"total_purchase",
         filters:[{field:"created_at",operator:"gte",time_var:"X_DAY_BEGIN",time_offset:-1},
                  {field:"created_at",operator:"lt",time_var:"X_DAY_END",time_offset:-1},
                  {field:"status",operator:"eq",value:"Paid"}]}
      ]}, action_type="email", action_config={to:"admin@company.com"})
→ Validates both queries against VitalSync API
→ n8n workflow: Schedule(8am) → 2x HTTP Request (parallel) → Merge → IF → Gmail
→ "Created 'Daily Revenue Report'. Runs daily at 8:00 AM."
```
