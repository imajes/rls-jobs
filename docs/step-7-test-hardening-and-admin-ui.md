# Step Seven - Test Hardening and Admin UI

Date: 2026-02-19

## Outcome

Completed two major improvements:

1. substantially expanded automated test coverage in both `slack-app` and `jobs-api`
2. implemented a secured admin UI in `jobs-api` for posting edit/cleanup workflows

## Test suite upgrades

### Slack app

- Added Node-native test harness (`node:test`) with scripts:
  - `npm test`
  - `npm run test:coverage`
  - `npm run test:coverage:check`
- Added coverage for:
  - channel routing logic
  - form validation logic
  - preview/posting in-memory stores
  - Jobs API client (success + error handling)
  - env config validation helpers

### Jobs API

- Added/expanded tests for:
  - models (`Posting`, `AuthLink`, `IntakeEvent`)
  - ingest service (`IngestSlackEvent`)
  - API edge cases (`/api/v1/intake`, `/api/v1/auth_links`)
  - admin controller flows (`/admin/postings`)
- Set test parallelism to 1 worker to avoid cross-test `ENV` mutation flakiness.
- Added opt-in built-in coverage summary/check support via env flags:
  - `COVERAGE=1 bin/rails test`
  - `COVERAGE=1 COVERAGE_MIN_LINES=75 COVERAGE_MIN_BRANCHES=60 bin/rails test`

## Admin UI deliverables

Implemented authenticated admin namespace in Rails:

- routes under `/admin`
- RBAC strategy based on Slack session user ID and env allowlist:
  - `RLS_ADMIN_SLACK_USER_IDS`
- admin capabilities:
  - filter/search listing inventory
  - edit normalized posting fields
  - patch values payload JSON
  - resync normalized fields from payload JSON
  - archive/restore entries
  - bulk-delete stale archived records older than N days

## Verification

- Slack tests pass locally (`npm test`)
- Slack lint passes (`npm run lint`)
- Ruby syntax checks pass for new Rails controllers/models/tests
- Full Rails test execution still requires the intended Rails-8 Ruby/Bundler runtime

## Operational note

The admin UI is protected by RLS session auth and admin allowlist checks, but production safety still depends on setting `RLS_ADMIN_SLACK_USER_IDS` correctly.
