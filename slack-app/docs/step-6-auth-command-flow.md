# Step Six - Slack Auth Command Flow

Date: 2026-02-19

## New slash commands

- `/rls-jobs-auth`
- `/rls-job-auth` (typo/alias support)

## Behavior

On command invocation:

1. Slack app requests one-time auth URL from Jobs API endpoint configured by `RLS_JOBS_API_AUTH_LINK_URL`.
2. If successful, bot DMs requester with one-time link and expiry guidance.
3. If not configured or request fails, bot DMs actionable failure reason.

## Config additions

- `RLS_JOBS_API_AUTH_LINK_URL` (required for auth command)
- existing `RLS_JOBS_API_TOKEN` reused for API auth

## Related updates

- `manifest.json` now includes auth commands.
- deploy readiness script validates auth commands are present.
- Jobs API client supports auth-link create call in addition to intake publish/update/archive webhooks.
