# Step Four - Ingest API and Persistence

Date: 2026-02-19

## Added endpoint

- `POST /api/v1/intake`
- Controller: `Api::V1::IntakeController`
- Auth base: `Api::V1::BaseController`

## Security

Bearer-token gate:

- environment variable: `RLS_JOBS_API_TOKEN`
- if configured, endpoint requires `Authorization: Bearer <token>`
- responses:
  - `401` unauthorized on mismatch/missing token
  - `400` invalid/empty JSON body
  - `422` semantic validation failure

## Persistence model

### `postings`

Stores one current materialized record per Slack posting (`external_posting_id` unique), including:

- kind, status, lifecycle timestamps
- route/channel/slack provenance
- normalized searchable fields (`company_name`, `role_title`, `headline`, `location_summary`, etc.)
- source snapshots (`values_payload`, `last_payload`)

### `intake_events`

Immutable ingest log for auditing and replay support:

- unique `event_fingerprint` for idempotency
- `event_type`, `kind`, posting linkage
- `occurred_at`, `received_at`
- raw event `payload`

## Service object

`IngestSlackEvent` performs:

1. envelope validation
2. deterministic fingerprinting
3. dedupe short-circuit
4. posting upsert + event append in one transaction

## Tests

Added integration coverage for:

- successful ingest create
- duplicate payload idempotency
- archive lifecycle transition
- bearer-token enforcement

File:
- `test/integration/api/v1/intake_controller_test.rb`

## Follow-up

Step Five will expose read-side browsing/search/filter UX over `postings`.
