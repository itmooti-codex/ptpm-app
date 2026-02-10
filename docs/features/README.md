# Reusable Feature Patterns

This directory contains documented feature patterns extracted from production apps. Each file is a self-contained guide that Claude can read to implement the same feature in a new app.

## Available Features

| Feature | Source App | File |
|---------|-----------|------|
| **Buddzee AI Assistant (Brand & Identity)** | **all apps** | **`buddzee-ai-assistant.md`** |
| OneSignal Push Notifications | phyx-nurse-admin | `onesignal-notifications.md` |
| Buddzee Chat (SSE + n8n) | phyx-nurse-admin | `ai-chat-agent.md` |
| Buddzee Dynamic Metrics | phyx-nurse-admin | `dynamic-metrics.md` |
| NanoBanana Image Generation | standalone CLI | `nanobana-image-generation.md` |
| Social Feed / MemberFeed | memberfeed-eventmx | `social-feed.md` |
| LMS Notifications & Courses | AWC-LMS | `lms-notifications-courses.md` |
| Buddzee Voice & Vision Assistant | phyx-nurse-admin | `voice-vision-assistant.md` |
| Buddzee Frustration Detection | phyx-nurse-admin | `frustration-detection.md` |
| Buddzee Dashboard Builder | bb-dashboard | `buddzee-dashboard-builder.md` |
| Buddzee Automation Engine (VitalSync + n8n) | phyx-nurse-admin | `automation-engine.md` |
| Buddzee Feature Request Collection | phyx-nurse-admin | `feature-request-collection.md` |

## Contributing a Feature

When you build a significant new feature in a child app, document it using the template below and add it here. Then run `./scripts/sync-child.sh --all` to push it to all projects.

## Feature Doc Template

Every feature doc should follow this structure:

```markdown
# Feature Name

## Overview
One-paragraph description of what this feature does and why it's useful.

## Architecture
- How many files are involved
- High-level data flow (e.g., Frontend → Backend → External Service → Response)
- Key design decisions and why

## Files to Copy
List every file needed, grouped by layer:
- **Backend:** `server/src/routes/feature.ts`, ...
- **Frontend hooks:** `src/hooks/useFeature.ts`, ...
- **Frontend components:** `src/components/Feature.tsx`, ...
- **Stores:** `src/stores/useFeatureStore.ts`, ...
- **Types:** additions to `src/types/index.ts`

## Dependencies
npm packages to install (with versions if critical).

## Environment Variables
Any new env vars needed.

## Database Tables
SQL CREATE statements if applicable.

## Implementation Steps
Numbered steps to add this feature to a new app.

## Gotchas & Lessons Learned
Things that went wrong during development and how to avoid them.

## Example Usage
Key code snippets showing how the feature is used.
```
