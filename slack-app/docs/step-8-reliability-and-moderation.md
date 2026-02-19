# Step 8 (Slack App): Reliability + Hybrid State + Soft Moderation

## Delivered

1. API-first App Home with fallback
- Added Jobs API read integration (`listPostings`, `getPosting`).
- Added read-through cache (`src/postings-cache.js`, default TTL 60s).
- App Home now:
  - reads from API first when `RLS_API_READ_ENABLED=true`
  - falls back to stale cache/local store on read failures
  - hydrates local posting store from API for action continuity after restart

2. Durable ingest outbox
- Added `src/ingest-outbox.js` with persistent NDJSON queue.
- Lifecycle events (`published`, `updated`, `archived`) now enqueue-first and retry with backoff.
- Dead-letter handling writes exhausted events to `storage/ingest-outbox.dead.ndjson`.

3. Soft moderation enrichment
- On publish, app fetches `users.info` and computes `accountAgeDays`.
- New-account submissions (threshold via `RLS_NEW_ACCOUNT_DAYS`) are flagged in lifecycle payload metadata.
- Optional moderator notification to `RLS_MOD_QUEUE_CHANNEL_ID`.

4. Runtime and deploy updates
- Added users scope in Slack manifest: `users:read`.
- Docker image now prepares `/app/storage` for outbox persistence.
- Added `.env.sample` vars for API reads, outbox controls, moderation controls.

## New environment variables

- `RLS_JOBS_API_POSTINGS_URL`
- `RLS_API_READ_ENABLED`
- `RLS_OUTBOX_ENABLED`
- `RLS_OUTBOX_PATH`
- `RLS_OUTBOX_DEAD_PATH`
- `RLS_OUTBOX_FLUSH_INTERVAL_MS`
- `RLS_INGEST_RETRY_MAX_ATTEMPTS`
- `RLS_INGEST_RETRY_BASE_MS`
- `RLS_MODERATION_ENABLED`
- `RLS_NEW_ACCOUNT_DAYS`
- `RLS_MOD_QUEUE_CHANNEL_ID`

## Testing

- Added tests for:
  - outbox deterministic IDs, retry/dead-letter flow
  - API read client methods and URL resolution
  - posting cache behavior
  - posting store sync from API snapshots
- Result: `npm test` and `npm run lint` pass.

## Ops note

For durable retries in production, mount a persistent volume to `slack-app/storage`. Stateless container filesystems will lose queued retry state on restart.

