# ADR: Step 9 Ops Telemetry + Beta Isolation

Date: 2026-02-19
Status: Accepted
Owners: RLS Jobs maintainers

## Context

RLS Jobs now has reliability hardening (outbox, retries, API-first reads), but lacks a formalized operational telemetry layer and beta isolation mode for controlled rollout.

Operational requirements:
- Telemetry must go to both structured logs and Slack ops channel.
- Slack ops destination is `#rls-jobs-bot-ops`.
- Alerts require dedupe and recovery semantics to reduce noise.
- Beta mode must constrain operational posting behavior to `#rls-jobs-beta`.

## Decision

### 1. Alert contract (shared)
Each alert event emitted by either service follows:
- `service`: `slack-app` | `jobs-api`
- `severity`: `warning` | `critical`
- `code`: stable machine code
- `message`: human summary
- `context`: object
- `fingerprint`: dedupe key component
- `detected_at`: ISO8601 UTC

### 2. Dual-sink telemetry
- Structured logs are canonical and always emitted.
- Slack alert send is best-effort via incoming webhook configured for `#rls-jobs-bot-ops`.
- If Slack delivery fails, emit `ALERT_DELIVERY_FAILED` in structured logs.

### 3. Dedupe and recovery
- Suppress duplicate alerts for same `code + fingerprint` within configured interval (`RLS_ALERTS_MIN_INTERVAL_SECONDS`, default 900).
- Emit recovery event using `*_RECOVERED` code after metric normalizes for at least one interval.

### 4. Beta mode
- `RLS_OPERATION_MODE=beta` activates hard isolation.
- All publishes force-route to `#rls-jobs-beta`.
- Slash command intake outside beta channel is rejected with guidance.
- Global shortcuts remain allowed, but resulting publishes are still force-routed to beta channel.

### 5. Ops visibility surfaces
- Jobs API adds:
  - `GET /admin/ops` (admin protected)
  - `GET /api/v1/ops/summary` (bearer protected)
- Slack app adds:
  - `/rls-jobs-health` (and alias)

## Roll-forward
1. Implement alert modules in both services.
2. Wire alert emitters into outbox fallback/dead-letter and API failure counters.
3. Implement beta mode routing and command restrictions.
4. Add ops routes/UI and machine summary endpoint.
5. Add test coverage for dedupe/recovery, beta mode, and ops endpoints.
6. Update runbooks and env docs.

## Rollback
- Set `RLS_ALERTS_ENABLED=false` to disable Slack sends while retaining logs.
- Set `RLS_OPERATION_MODE=normal` to exit beta isolation.
- Keep outbox and ingest behavior unchanged.

## Consequences
Positive:
- Better incident response and visibility.
- Controlled beta rollout with low channel risk.

Tradeoffs:
- Added operational complexity (alert tuning and thresholds).
- Additional config/env management.

## Mandatory gate
Per approved Step 9 execution policy:
- This ADR must exist before any restart actions.
- After ADR creation, implementation must explicitly request permission before restarting services.
