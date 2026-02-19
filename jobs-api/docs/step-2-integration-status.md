# Step Two - Integration Status from Slack App

Date: 2026-02-19

## Current status

Slack app now emits publish webhooks after channel posting when `RLS_JOBS_API_INGEST_URL` is configured.

No Rails ingest endpoint is implemented yet in `jobs-api` during this step.

Note: edit/archive actions currently update Slack messages and App Home state only; they do not yet emit update webhooks.

## Incoming webhook expectations

The Slack app sends JSON with:

- event metadata (`eventType`, `kind`, `previewId`, `postedAt`)
- routing metadata (`channelFocus`, `channelId`, `channelLabel`)
- Slack provenance (`teamId`, preview DM info, published message ts, publisher user id)
- full structured `values` payload from intake modal

Bearer token auth is supported from Slack app via `Authorization: Bearer <token>` when `RLS_JOBS_API_TOKEN` is set.

## What Step Four should implement

1. `POST /api/v1/intake` endpoint in Rails.
2. bearer token verification (or signed request strategy).
3. idempotency key strategy using `previewId + channelId` (or stricter key).
4. durable persistence for both post kinds.
5. structured response with clear error codes for Slack-side observability.
