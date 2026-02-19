# Step 8 (Jobs API): Data Hardening + Moderation + Replay

## Delivered

1. Read APIs for Slack state restoration
- Added:
  - `GET /api/v1/postings`
  - `GET /api/v1/postings/:external_posting_id`
- Endpoints are bearer-token protected via existing ingest token guard.

2. Schema and integrity hardening
- Added `payload_version` to `intake_events`.
- Added moderation fields to `postings`:
  - `moderation_flagged`
  - `moderation_state`
  - `moderation_reason`
  - `account_age_days`
  - `moderation_last_reviewed_at`
  - `moderation_reviewed_by`
- Added operational indexes for poster/user and event-time query paths.
- Added allowlist check constraints for posting status/kind, moderation state, and intake event type/kind.

3. Ingest failure capture and replay
- Added `ingest_failures` table and `IngestFailure` model.
- `IngestSlackEvent` now records failed payloads and resolves matching failures on successful ingest.
- Added replay task:
  - `bin/rails rls:replay_ingest_failures`
  - supports dry-run (default), limit, and targeted replay by ID.

4. Trust/safety moderation ingestion
- Ingest now persists moderation metadata from Slack lifecycle payloads.
- Soft-gate behavior remains non-blocking; records are visible for review.

5. Admin moderation workflow
- Added moderation filters in admin listing.
- Added member actions:
  - `mark_reviewed`
  - `clear_flag`
  - `escalate`
- Added moderation fields to admin edit form.

## Validation hardening

`IngestSlackEvent` now enforces:
- event type allowlist
- kind allowlist
- typed envelope (`values`, `route`, `slack` must be objects)
- required nested fields
- `payloadVersion` positive integer

## Testing updates

- Added/expanded tests for:
  - API read endpoints
  - moderation admin actions
  - ingest failure model behavior
  - ingest service validation and moderation mapping
  - replay task behavior (dry-run and execution)

## Local runtime note

Project expects `ruby-3.4.5` (`.ruby-version`). Ensure local Ruby/Bundler matches before running `bin/rails` commands.
