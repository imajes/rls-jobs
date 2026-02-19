# RLS Jobs API (Rails 8)

Ingests structured Slack posting events and serves a protected browse UI for jobs/candidates.

## Features implemented

- Webhook ingest endpoint: `POST /api/v1/intake`
- Slack read endpoints:
  - `GET /api/v1/postings`
  - `GET /api/v1/postings/:external_posting_id`
- Durable persistence:
  - `postings` (current materialized listing state)
  - `intake_events` (immutable ingest history)
  - `ingest_failures` (failed ingest payload capture/replay)
- RLS auth bootstrap:
  - `POST /api/v1/auth_links` (issues one-time links)
  - `GET /auth/slack/:token` (redeem link and start session)
  - `GET /auth/required` (access instructions)
  - `DELETE /auth/logout`
- Browse UI:
  - `GET /` and `GET /postings`
  - `GET /postings/:id`
  - filters/search/sorts + responsive layout

## Environment variables

- `RLS_JOBS_API_TOKEN`
  - shared bearer token expected from Slack app for API calls
- `RLS_JOBS_WEB_BASE_URL`
  - public base URL used when generating one-time auth links
- `RLS_AUTH_LINK_TTL_SECONDS`
  - one-time link lifetime (default `600`)
- `RLS_ADMIN_SLACK_USER_IDS`
  - comma-separated Slack user IDs with access to `/admin`
  - if unset, admin is allowed only in non-production environments

## Security/session behavior

- One-time links are stored as token digests only.
- Links are single-use (`consumed_at`) and expiry-bound (`expires_at`).
- Browser sessions are activity-refreshed, but hard-capped at 1 hour.
- Browse routes require authenticated RLS session.
- Admin routes require both authenticated session and admin Slack user ID allowlist.

## Admin UI

- `GET /admin`
  - listing cleanup and moderation dashboard
- actions:
  - archive/restore postings
  - edit normalized fields
  - repair values payload JSON
  - resync normalized fields from JSON payload
  - moderation actions (`mark_reviewed`, `clear_flag`, `escalate`)
  - bulk-delete stale archived postings older than N days

## Local development

Run migrations and tests in a Rails-8-compatible Ruby/Bundler environment:

```zsh
ruby -v # should match `.ruby-version` (ruby-3.4.5)
bin/rails db:migrate
bin/rails test
```

Coverage run:

```zsh
COVERAGE=1 bin/rails test
```

Coverage threshold run:

```zsh
COVERAGE=1 COVERAGE_MIN_LINES=75 COVERAGE_MIN_BRANCHES=60 bin/rails test
```

Coverage summaries are written to `jobs-api/coverage/summary.json` and `jobs-api/coverage/summary.txt`.

Then run server:

```zsh
bin/rails server
```

## Documentation

- `docs/step-4-ingest-and-persistence.md`
- `docs/step-5-browse-ui.md`
- `docs/step-6-rls-auth.md`
- `docs/step-8-data-hardening-and-moderation.md`
