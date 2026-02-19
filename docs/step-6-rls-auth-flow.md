# Step Six - RLS Authentication Flow (Slack -> Rails)

Date: 2026-02-19

## Outcome

Implemented a Slack-driven one-time-link auth flow and enforced a bounded Rails session model suitable for Chatham-House style access controls.

## End-to-end flow

1. User runs `/rls-jobs-auth` (or `/rls-job-auth`) in Slack.
2. Slack app calls Jobs API `POST /api/v1/auth_links`.
3. Jobs API issues one-time tokenized URL.
4. Slack app DMs the user the one-time link.
5. User opens `/auth/slack/:token` in browser.
6. Rails redeems token once, starts session, and routes to listings.

## Session policy enforced

- One-time link TTL (default): 10 minutes (`RLS_AUTH_LINK_TTL_SECONDS` configurable)
- Session hard max TTL: 1 hour (never extended)
- Sliding idle window: 15 minutes, refreshed on activity
- On idle or hard expiry: session is cleared, user redirected to `/auth/required`

This satisfies: session can be activity-refreshed, but cannot exceed one hour total.

## Slack app changes

- Added auth slash commands:
  - `/rls-jobs-auth`
  - `/rls-job-auth`
- Added Jobs API client call for auth-link creation.
- Added config/env support:
  - `RLS_JOBS_API_AUTH_LINK_URL`
- Updated manifest and deploy readiness checks to include auth commands.

## Rails changes

- Added `auth_links` table + `AuthLink` model.
- Added API endpoint `POST /api/v1/auth_links` (token-protected).
- Added browser auth endpoints:
  - `GET /auth/required`
  - `GET /auth/slack/:token`
  - `DELETE /auth/logout`
- Added shared session helpers in `ApplicationController`.
- Enforced authenticated access on browse routes via `PostingsController` before actions.

## Verification status

- Slack app lint passes.
- Ruby syntax checks pass for Step Six controller/model files.
- Full Rails runtime execution remains blocked in this shell by local Ruby/Bundler mismatch against Rails 8 lockfile.

## Next step linkage

This closes the planned Step Six requirement for RLS-gated access strategy and one-time link session bootstrap.
