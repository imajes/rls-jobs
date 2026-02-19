# Step Three - Slack App Go-Live Runbook

Date: 2026-02-19

## 1. Scope

This runbook is for deploying `slack-app` as a production Socket Mode worker.

It covers:

- app configuration in Slack
- environment setup
- deploy/readiness checks
- smoke tests
- rollback

## 2. Prerequisites

- Workspace admin access for app configuration/install.
- Bot invited to publish target channels.
- Runtime capable of long-lived outbound WebSocket connections.

## 3. Required environment variables

Must be set:

- `SLACK_APP_TOKEN`
- `SLACK_BOT_TOKEN`

Recommended for full publish routing:

- `RLS_CHANNEL_JOBS_ID`
- `RLS_CHANNEL_ONSITE_JOBS_ID`
- `RLS_CHANNEL_REMOTE_JOBS_ID`
- `RLS_CHANNEL_JOBS_COFOUNDERS_ID`
- `RLS_CHANNEL_JOBS_CONSULTING_ID`

Optional webhook:

- `RLS_JOBS_API_INGEST_URL`
- `RLS_JOBS_API_TOKEN`
- `RLS_JOBS_API_TIMEOUT_MS` (default `5000`)

## 4. Manifest and app settings checklist

Verify `manifest.json` includes:

- slash commands:
  - `/rls-jobs-intake`
  - `/rls-job-intake`
- bot scopes:
  - `commands`
  - `chat:write`
  - `chat:write.public`
- App Home enabled
- event subscription:
  - `app_home_opened`
- Socket Mode enabled

After updates, reinstall or refresh app config in Slack admin UI.

## 5. Pre-deploy checks

From `slack-app/`:

```zsh
npm run lint
npm run export:ui
npm run check:deploy
```

`check:deploy` runs in strict mode and fails if:

- required env vars are missing
- recommended route channel env vars are missing
- manifest checks fail

## 6. Deploy options

### A. Node process deployment

```zsh
npm ci --omit=dev
npm run start:prod
```

### B. Container deployment

```zsh
docker build -t rls-jobs-slack-app:latest .
docker run --rm --env-file .env rls-jobs-slack-app:latest
```

No inbound port is needed for Socket Mode.

## 7. Post-deploy smoke tests

1. Run `/rls-jobs-intake` with no args.
   - Expect intake chooser modal.
2. Run `/rls-job-intake candidate`.
   - Expect direct candidate step-1 modal.
3. Submit a test job and publish.
   - Expect channel message appears in selected route.
4. In App Home:
   - Expect posting appears in `Active`.
   - Edit posting and confirm channel card updates.
   - Archive posting and confirm archived marker appears.
5. If webhook configured:
   - Confirm ingest request is received at API endpoint.

## 8. Observability expectations

Expected startup logs:

- app started in socket mode
- warnings for any missing recommended channel env vars

Expected runtime logs:

- preview created
- publish success path
- webhook failures as warnings (non-blocking)

## 9. Rollback

If a release is unhealthy:

1. stop new worker
2. redeploy prior image/build
3. verify slash command and publish flow

Because current posting/preview stores are in-memory, restarting the worker clears runtime state. This is expected until Step Four persistence.
