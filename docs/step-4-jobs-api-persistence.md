# Step Four - Jobs API Persistence and Webhook Ingest

Date: 2026-02-19

## Outcome

Implemented durable webhook ingestion in `jobs-api` and expanded the Slack app webhook coverage from publish-only to full posting lifecycle events:

- `slack_post_published`
- `slack_post_updated`
- `slack_post_archived`

## What was built

### Rails API ingest endpoint

- Added `POST /api/v1/intake`.
- Added bearer-token auth guard via `RLS_JOBS_API_TOKEN`.
  - If token is set, requests must include `Authorization: Bearer <token>`.
  - If token is not set, endpoint allows requests (development-friendly).
- Added robust JSON error responses for invalid body/auth failures.

### Durable data model

Added migrations for:

- `postings`
  - normalized searchable fields
  - Slack provenance fields
  - lifecycle state (`active` / `archived`)
  - full `values_payload` and latest `last_payload`
- `intake_events`
  - immutable event history
  - event fingerprint dedupe key
  - source payload capture
  - optional relation to `postings`

### Ingestion service

- Added `IngestSlackEvent` service to:
  - validate envelope
  - compute deterministic payload fingerprint
  - dedupe repeats idempotently
  - upsert `postings` by external posting id
  - persist immutable `intake_events`
  - map event type to posting lifecycle status

### Slack webhook lifecycle coverage

Updated Slack app handlers to emit API events for:

- publish (already present, now normalized through shared builder)
- edit (`slack_post_updated`)
- archive (`slack_post_archived`)

This closes the previous gap where edit/archive were Slack-only and not persisted downstream.

## Verification status

- Slack app lint: passed (`npm run lint` in `slack-app/`).
- Rails runtime verification (`bin/rails db:migrate`, `bin/rails test`) is blocked in this shell due local Ruby/Bundler mismatch against Rails 8 lockfile.
  - Migrations and tests are included in git for execution in the correct Rails runtime.

## Next step linkage

Step Five will build the human-browsable Rails UI over the new `postings` table (filters/search/sorting + responsive layout).
