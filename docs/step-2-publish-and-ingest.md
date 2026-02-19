# Step Two - Publish Workflow and Ingestion Handshake

Date: 2026-02-19

## Outcome

Implemented the Step Two runtime path in the Slack app:

1. user submits guided intake modal
2. app sends DM preview
3. user can override destination route
4. user clicks `Publish`
5. app posts compact card to the selected Slack channel
6. app sends optional webhook payload to jobs API ingest endpoint
7. app tracks published posting in App Home for poster management

This closes the "preview only" gap from Step One.

## What changed

- Added explicit `Publish` action to both job and candidate preview cards.
- Persisted per-preview route choice in in-memory store.
- Added duplicate publish guard per route (same preview cannot publish twice to the same channel).
- Added optional webhook sender for downstream API ingestion.
- Added poster-only edit/archive controls for published postings.
- Added App Home listing so posters can review all posts and take actions.
- Regenerated Block Kit JSON prototypes to match runtime.

## Routing behavior

- Default route still comes from recommendation heuristic.
- Preview overflow route selection updates stored route.
- Publish uses latest selected route.
- If target channel ID is not configured, app blocks publish and returns a DM with the missing env var name.

## Ingestion behavior

- Webhook send is **non-blocking for channel publish**:
  - channel publish succeeds even if webhook fails
  - webhook failure is logged for retry/observability follow-up
- Webhook is skipped if no ingest URL is configured.

## Environment configuration added

- `RLS_JOBS_API_INGEST_URL`
- `RLS_JOBS_API_TOKEN`
- `RLS_JOBS_API_TIMEOUT_MS` (default `5000`)

## Known limitations (expected in this phase)

- Preview state is in process memory:
  - expires after TTL
  - resets on app restart
- Posting management state is also in process memory:
  - App Home history resets on app restart
- No retry queue for failed webhook sends yet.
- No durable publish audit table yet (to be covered in Rails API step).

## Next step linkage

- Step Three: package and go-live checklist (manifest, scopes, env, rollout runbook).
- Step Four: implement Rails ingest endpoint and persistence model to receive published payloads.
