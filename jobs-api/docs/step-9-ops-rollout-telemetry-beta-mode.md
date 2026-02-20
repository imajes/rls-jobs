# Step 9 (Jobs API): Ops Surfaces + Persistent Alert State

## Implemented

1. Ops alerting runtime:
- `Ops::AlertDispatcher`
  - canonical structured log emission
  - Slack webhook delivery (best-effort)
  - persistent dedupe via `ops_alert_states`
- `Ops::Monitor`
  - threshold evaluation
  - recovery semantics after full interval
  - rolling-window event tracking for auth/intake failures

2. Persistent ops signal storage:
- `ops_events`
  - event stream for rolling windows (`auth_link_error`, `intake_validation_error`, duplicates)
- `ops_alert_states`
  - dedupe/recovery state by `code + fingerprint`

3. New ops interfaces:
- `GET /api/v1/ops/summary` (bearer-protected)
- `GET /admin/ops` (admin + authenticated session)

4. Alert families:
- `API_INGEST_FAILURE_UNRESOLVED_HIGH`
- `API_AUTH_LINK_ERRORS_HIGH`
- `API_INTAKE_VALIDATION_ERRORS_HIGH`
- `*_RECOVERED` variants

5. Beta-default listing scope:
- Browse and admin listing pages default to `RLS_CHANNEL_JOBS_BETA_ID` when `RLS_OPERATION_MODE=beta`.
- Explicit toggle allows `scope=all` to view all records.

## Env Vars Added/Used

- `RLS_OPERATION_MODE=normal|beta`
- `RLS_CHANNEL_JOBS_BETA_ID`
- `RLS_ALERTS_ENABLED`
- `RLS_ALERTS_SLACK_WEBHOOK_URL`
- `RLS_ALERTS_MIN_INTERVAL_SECONDS`
- `RLS_INGEST_FAILURE_WARN`
- `RLS_INGEST_FAILURE_CRITICAL`
- `RLS_AUTH_LINK_ERROR_WARN`
- `RLS_INTAKE_VALIDATION_ERROR_WARN`

## Operational Expectations

- Webhook should point to `#rls-jobs-bot-ops`.
- Logs remain mandatory and canonical even when webhook is disabled/failing.
- `/admin/ops` is the first-stop triage panel for ingest/auth/moderation/retention.
