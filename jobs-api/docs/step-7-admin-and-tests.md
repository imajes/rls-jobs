# Step Seven - Jobs API Admin UI + Test Hardening

Date: 2026-02-19

## Admin namespace

Added `/admin` tooling with RBAC:

- base controller enforces:
  - authenticated RLS session
  - session refresh checks
  - admin allowlist check
- allowlist env var:
  - `RLS_ADMIN_SLACK_USER_IDS` (comma-separated Slack user IDs)

## Admin operations

- listing + filters for moderation/cleanup
- edit posting normalized fields
- edit values payload JSON
- resync normalized fields from values payload
- archive / restore posting status
- bulk-delete stale archived records by age threshold

## Model/service alignment

- added `Posting.search_text_from_values` for reusable normalization
- ingest service now reuses model helper for consistent indexing behavior
- added `Posting#resync_from_values!` for admin repair flows

## Test additions

- model tests:
  - `test/models/posting_test.rb`
  - `test/models/auth_link_test.rb`
  - `test/models/intake_event_test.rb`
- service test:
  - `test/services/ingest_slack_event_test.rb`
- API tests expanded:
  - intake invalid JSON, semantic errors, wrong bearer token
  - auth-links wrong bearer token + required param validation
- admin tests:
  - `test/controllers/admin/postings_controller_test.rb`

## Stability guard

- `test/test_helper.rb` now uses one worker to avoid ENV race conditions across tests.
