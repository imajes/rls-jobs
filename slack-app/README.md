# RLS Jobs Slack App

Structured Slack intake for job postings and candidate availability using Bolt for JavaScript.

## Scope implemented through Step Six

- Global shortcuts for:
  - `Post a job`
  - `Post candidate availability`
- Slash command:
  - `/rls-jobs-intake` (opens type chooser by default)
  - `/rls-job-intake` (alias for typo-friendly entry)
  - `/rls-jobs-auth` (issues one-time web auth link via Jobs API)
  - `/rls-job-auth` (alias for typo-friendly entry)
- Block Kit modals for both post kinds + intake type chooser
- Strict required fields with inline modal validation
- Smart channel recommendation for:
  - `#jobs`
  - `#onsite-jobs`
  - `#remote-jobs`
  - `#jobs-cofounders`
  - `#jobs-consulting`
- DM preview back to submitter with recommended channel
- Route override from preview overflow
- Publish action that posts to configured destination channel
- Optional webhook send to jobs API after publish
- Optional lifecycle webhook send to jobs API on publish/edit/archive
- App Home view with "Your RLS Postings"
- API-first App Home hydration (feature-flagged) with local fallback
- Poster-only edit and archive actions for published postings
- One-time auth link command to bootstrap RLS-gated web session
- Durable lifecycle ingest outbox with retry/dead-letter files
- Soft moderation enrichment (new-account flag metadata + optional mod queue notification)

Step Three packages this for deployment and go-live.
Step Four/Step Six extend API sync and secure web-auth bootstrap.

Slash command behavior:

- with no argument: opens chooser (`Job listing` vs `Candidate availability`)
- with hint text: tries to infer and jump directly (for example `job`, `candidate`, `availability`)

## Local setup

1. Create and install app from `manifest.json` in your Slack workspace.
2. Create `.env` from `.env.sample`.
3. Set:
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
4. Optional: set channel IDs in `.env` to validate routing against real channels.
5. Install dependencies and run:

```zsh
npm install
npm start
```

## Deploy readiness

Run strict go-live checks before deploying:

```zsh
npm run check:deploy
```

This validates:

- required runtime env vars
- recommended route channel env vars
- manifest command/event/scope expectations

## Container packaging

Build image:

```zsh
docker build -t rls-jobs-slack-app:latest .
```

Run image:

```zsh
docker run --rm \
  --env-file .env \
  -v $(pwd)/storage:/app/storage \
  rls-jobs-slack-app:latest
```

The app runs in Socket Mode, so no inbound HTTP port is required.

## Lint

```zsh
npm run lint
```

## Tests

```zsh
npm test
```

Optional coverage output:

```zsh
npm run test:coverage
```

Coverage threshold check:

```zsh
npm run test:coverage:check
```

## Environment variables

Required:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Optional:

- `SLACK_LOG_LEVEL`
- `RLS_CHANNEL_JOBS_ID`
- `RLS_CHANNEL_ONSITE_JOBS_ID`
- `RLS_CHANNEL_REMOTE_JOBS_ID`
- `RLS_CHANNEL_JOBS_COFOUNDERS_ID`
- `RLS_CHANNEL_JOBS_CONSULTING_ID`
- `RLS_JOBS_API_INGEST_URL`
- `RLS_JOBS_API_POSTINGS_URL`
- `RLS_JOBS_API_AUTH_LINK_URL`
- `RLS_JOBS_API_TOKEN`
- `RLS_JOBS_API_TIMEOUT_MS`
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

## Notes

- This app uses Socket Mode for local development.
- Runtime modal templates live in `src/modal-templates/`.
- `ui-prototypes/` is for design/preview exports and is not required at runtime.
- Slash command request URLs are placeholders in the manifest when using Socket Mode.
- Incoming Slack request signature verification is handled by Bolt.
- For publishing to private channels, invite the bot to each target channel.
- After manifest changes, reinstall or update app settings so `app_home_opened` events are enabled.
- `users:read` bot scope is required for account-age moderation enrichment.
- Outbox durability requires persistent storage mounted to `/app/storage`.
- For production rollout, see `slack-app/docs/step-3-go-live.md`.
