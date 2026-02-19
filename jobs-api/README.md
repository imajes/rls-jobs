# RLS Jobs API (Rails 8)

Ingests structured Slack posting events and serves a protected browse UI for jobs/candidates.

## Features implemented

- Webhook ingest endpoint: `POST /api/v1/intake`
- Durable persistence:
  - `postings` (current materialized listing state)
  - `intake_events` (immutable ingest history)
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

## Security/session behavior

- One-time links are stored as token digests only.
- Links are single-use (`consumed_at`) and expiry-bound (`expires_at`).
- Browser sessions are activity-refreshed, but hard-capped at 1 hour.
- Browse routes require authenticated RLS session.

## Local development

Run migrations and tests in a Rails-8-compatible Ruby/Bundler environment:

```zsh
bin/rails db:migrate
bin/rails test
```

Then run server:

```zsh
bin/rails server
```

## Documentation

- `docs/step-4-ingest-and-persistence.md`
- `docs/step-5-browse-ui.md`
- `docs/step-6-rls-auth.md`
