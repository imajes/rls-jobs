# RLS Jobs Slack App

Structured Slack intake for job postings and candidate availability using Bolt for JavaScript.

## Scope implemented in Step One

- Global shortcuts for:
  - `Post a job`
  - `Post candidate availability`
- Slash command:
  - `/rls-jobs-intake` with `job` or `candidate`
- Block Kit modals for both post kinds
- Strict required fields with inline modal validation
- Smart channel recommendation for:
  - `#jobs`
  - `#onsite-jobs`
  - `#remote-jobs`
  - `#jobs-cofounders`
  - `#jobs-consulting`
- DM preview back to submitter with recommended channel (Step One behavior)

Step Two adds channel posting and API webhook ingestion.

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

## Lint

```zsh
npm run lint
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

## Notes

- This app uses Socket Mode for local development.
- Slash command request URLs are placeholders in the manifest when using Socket Mode.
- Incoming Slack request signature verification is handled by Bolt.
