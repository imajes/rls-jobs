# Step 9: Ops Rollout, Dual-Sink Telemetry, and Beta Isolation

## Step Zero Gate

- ADR written: `docs/adr/ADR-step-9-ops-telemetry-beta-mode.md`
- Gate respected before implementation/restart work.

## What This Step Adds

1. Dual-sink operational alerting:
- Canonical structured logs in both services.
- Best-effort Slack delivery via incoming webhook to `#rls-jobs-bot-ops`.
- Dedupe by `code + fingerprint` with configurable interval.
- Recovery alert emission (`*_RECOVERED`) after a full normalization interval.

2. Slack app operational hardening:
- Outbox dead-letter critical alert (`SLACK_OUTBOX_DEAD_LETTERED`).
- Outbox backlog threshold alert + recovery (`SLACK_OUTBOX_BACKLOG_HIGH`, `SLACK_OUTBOX_BACKLOG_HIGH_RECOVERED`).
- API-read fallback alert (`SLACK_API_READ_FALLBACK_ACTIVE`).
- Slash command health endpoint:
  - `/rls-jobs-health`
  - `/rls-job-health`

3. Beta hard isolation:
- `RLS_OPERATION_MODE=beta` forces publish routing to `#rls-jobs-beta`.
- Route override controls are removed in beta mode previews.
- `/rls-jobs-intake` is rejected outside `#rls-jobs-beta` in beta mode.
- Global shortcuts remain enabled; publish route remains forced to beta channel.

4. Jobs API ops surfaces:
- `GET /api/v1/ops/summary` (bearer-protected JSON summary).
- `GET /admin/ops` (admin-protected human dashboard).
- Admin/browse beta-default scope with explicit “View all records” override.

5. Jobs API persistent ops signal architecture:
- `ops_events`: rolling-window event storage.
- `ops_alert_states`: persistent alert state for dedupe/recovery semantics.

## Alert Codes

### Slack app

- `SLACK_OUTBOX_DEAD_LETTERED` (critical)
- `SLACK_OUTBOX_BACKLOG_HIGH` (warning/critical)
- `SLACK_OUTBOX_BACKLOG_HIGH_RECOVERED` (warning)
- `SLACK_API_READ_FALLBACK_ACTIVE` (warning)
- `ALERT_DELIVERY_FAILED` (log-only transport failure marker)

### Jobs API

- `API_INGEST_FAILURE_UNRESOLVED_HIGH` (warning/critical)
- `API_INGEST_FAILURE_UNRESOLVED_HIGH_RECOVERED` (warning)
- `API_AUTH_LINK_ERRORS_HIGH` (warning)
- `API_AUTH_LINK_ERRORS_HIGH_RECOVERED` (warning)
- `API_INTAKE_VALIDATION_ERRORS_HIGH` (warning)
- `API_INTAKE_VALIDATION_ERRORS_HIGH_RECOVERED` (warning)
- `ALERT_DELIVERY_FAILED` (log-only transport failure marker)

## Rollout Windows (Single-Day)

1. Hour 0:
- Enable `RLS_OUTBOX_ENABLED=true`.
- Enable beta mode (`RLS_OPERATION_MODE=beta`, `RLS_CHANNEL_JOBS_BETA_ID`).

2. Hour 1:
- Enable `RLS_API_READ_ENABLED=true`.

3. Hour 2:
- Confirm moderation notifications and admin review workflows.

4. Hour 3:
- Confirm strict threshold alerting env is set and active.

## Monitoring Targets (7-day stabilization)

- Outbox backlog depth and dead-letter growth.
- Ingest unresolved failure count and replay movement.
- Auth-link failure rate and intake validation error rate.
- Alert noise quality (dedupe effectiveness).
- Moderation flagged volume trend.

## Key Files

- Slack app:
  - `slack-app/src/alerting.js`
  - `slack-app/src/handlers.js`
  - `slack-app/src/ingest-outbox.js`
  - `slack-app/src/config.js`
- Jobs API:
  - `jobs-api/app/services/ops/alert_dispatcher.rb`
  - `jobs-api/app/services/ops/monitor.rb`
  - `jobs-api/app/services/ops/summary_builder.rb`
  - `jobs-api/app/controllers/admin/ops_controller.rb`
  - `jobs-api/app/controllers/api/v1/ops_controller.rb`
  - `jobs-api/db/migrate/20260219100000_create_ops_events_and_alert_states.rb`
