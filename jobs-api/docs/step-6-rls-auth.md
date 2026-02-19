# Step Six - RLS Auth in Jobs API

Date: 2026-02-19

## Added persistence

- Migration: `create_auth_links`
- Model: `AuthLink`
  - stores SHA-256 token digest only (raw token never persisted)
  - one-time redeem (`consumed_at`)
  - expiry enforcement (`expires_at`)

## Added API endpoint

- `POST /api/v1/auth_links`
- controller: `Api::V1::AuthLinksController`
- auth: bearer token gate via `RLS_JOBS_API_TOKEN`
- request body:
  - `slack_user_id`
  - `slack_team_id`
  - `slack_user_name` (optional)
- response body:
  - `auth_url`
  - `expires_at`
  - `ttl_seconds`

## Added web auth endpoints

- `GET /auth/required` (instruction page)
- `GET /auth/slack/:token` (one-time redeem)
- `DELETE /auth/logout` (clear session)

## Session enforcement

Implemented in `ApplicationController`:

- hard TTL: 1 hour
- idle window: 15 minutes (sliding)
- hard cap never extends
- expired sessions are cleared and redirected to auth-required page

## Access control

- `PostingsController` now requires authenticated RLS session for index/show.

## Tests

Added:

- `test/integration/api/v1/auth_links_controller_test.rb`
- `test/controllers/auth_controller_test.rb`
- updated `test/controllers/postings_controller_test.rb` for authenticated browse flow
