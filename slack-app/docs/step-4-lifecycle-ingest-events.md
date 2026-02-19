# Step Four - Slack Lifecycle Ingest Events

Date: 2026-02-19

## Change summary

Expanded webhook emission from publish-only to full posting lifecycle:

- `slack_post_published`
- `slack_post_updated`
- `slack_post_archived`

## Why

Without update/archive webhook events, downstream Rails storage drifted from Slack state. This change keeps the API store synchronized with what users see in-channel.

## Implementation details

- Added shared ingest payload builder in `src/handlers.js`.
- Added shared `postLifecycleIngestEvent` wrapper for consistent logging/error handling.
- On edit success:
  - after Slack message update and App Home refresh, emits `slack_post_updated`.
- On archive success:
  - after Slack message archive marker update and App Home refresh, emits `slack_post_archived` with archiver metadata.
- Publish path now also uses shared payload helper and includes permalink consistently.

## Notes

- Ingest remains non-blocking to user publish/edit/archive UX.
- Failures are logged and do not roll back Slack message updates.
