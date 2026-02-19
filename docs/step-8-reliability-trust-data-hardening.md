# Step 8: Reliability, Data Architecture, and Trust/Safety Hardening

This step implements the next-phase production hardening roadmap across `slack-app` and `jobs-api`.

## Delivered

1. Hybrid state model for Slack App Home
- Added `jobs-api` read endpoints for posting restoration:
  - `GET /api/v1/postings`
  - `GET /api/v1/postings/:external_posting_id`
- Slack App Home is now API-first when `RLS_API_READ_ENABLED=true`.
- Added read-through cache (default TTL 60s) and local-store fallback when API reads fail.
- API responses hydrate local posting state so poster actions (edit/archive/details) continue to work after app restarts.

2. Durable lifecycle ingest outbox in Slack app
- Added persistent outbox queue in `slack-app/storage`:
  - primary queue: `ingest-outbox.ndjson`
  - dead-letter: `ingest-outbox.dead.ndjson`
- Outbox behavior:
  - enqueue-first with deterministic `event_id`
  - immediate delivery attempt
  - exponential retry + jitter
  - dead-letter after max attempts
- Feature-gated by `RLS_OUTBOX_ENABLED`.

3. Data architecture hardening in Jobs API
- Added schema/index/constraint migration for posting + intake integrity:
  - `payload_version` on `intake_events`
  - moderation columns on `postings`
  - operational indexes for poster/team/message and event-time queries
  - allowlist check constraints for event types, kinds, status, and moderation state
- Added `ingest_failures` table for failed payload capture and replay workflows.

4. Ingest contract hardening
- Ingest validation now enforces:
  - event type allowlist
  - kind allowlist
  - typed envelope requirements (`values`, `route`, `slack` objects)
  - required nested fields (`route.channelId`, `route.channelFocus`, `slack.teamId`, `slack.publishedByUserId`, `values.posterUserId`)
  - `payloadVersion` positive integer
- Failures now persist to `ingest_failures` with deduping by fingerprint.

5. Trust/safety soft gate
- Slack app enriches intake with `accountAgeDays` from `users.info`.
- Soft moderation flagging for new accounts (default threshold: 14 days).
- Flag metadata is forwarded in lifecycle ingest payloads.
- Optional moderator channel notifications via `RLS_MOD_QUEUE_CHANNEL_ID`.
- Posting remains publishable (non-blocking soft gate).

6. Admin moderation operations
- Admin filters include moderation facets (flagged/unflagged/state).
- Added moderation actions:
  - `mark_reviewed`
  - `clear_flag`
  - `escalate`
- Moderation metadata is visible/editable in admin posting editor.

7. CI hardening
- Added root CI workflows for monorepo operation:
  - `slack-app-ci.yml` (Node 22, `npm ci`, lint, tests)
  - `jobs-api-ci.yml` (Ruby 3.4.5, test DB prepare, tests)

8. Thread enrichment planning package (spec-only)
- Added ADR documenting boundaries, identity protection rules, retention constraints, interface draft, and implementation go/no-go criteria.

## New/updated environment variables

### Slack app
- `RLS_JOBS_API_POSTINGS_URL`
- `RLS_API_READ_ENABLED`
- `RLS_OUTBOX_ENABLED`
- `RLS_OUTBOX_PATH`
- `RLS_OUTBOX_DEAD_PATH`
- `RLS_OUTBOX_FLUSH_INTERVAL_MS`
- `RLS_INGEST_RETRY_MAX_ATTEMPTS`
- `RLS_INGEST_RETRY_BASE_MS`
- `RLS_MODERATION_ENABLED`
- `RLS_NEW_ACCOUNT_DAYS`
- `RLS_MOD_QUEUE_CHANNEL_ID`

### Jobs API
- existing auth/token envs retained
- no new required env var introduced for this step

## Verification status

- Slack app lint/tests: passed locally.
- Jobs API: Ruby syntax checks passed on changed files.
- Full Rails test run could not be executed in this terminal due local Ruby/Bundler mismatch against project requirements (`ruby-3.4.5` / Bundler from lockfile). CI workflow now enforces correct runtime.

