# Step Three - Package and Deploy

Date: 2026-02-19

## Outcome

Packaged the Slack app for production deployment and documented a go-live runbook that covers:

- manifest/app settings alignment
- environment variable readiness
- deployment artifact build/run
- rollout verification checks
- rollback path

## Deliverables

- runtime config validation on startup (required envs fail fast)
- deploy readiness script (`npm run check:deploy`)
- container packaging (`slack-app/Dockerfile`)
- deployment docs:
  - `slack-app/docs/step-3-go-live.md`
  - updated `slack-app/README.md`

## Packaging additions

Added production-oriented artifacts:

- `slack-app/Dockerfile`
- `slack-app/.dockerignore`
- `slack-app/scripts/check-deploy-readiness.js`

Updated runtime behavior:

- startup now validates required env vars
- startup logs missing recommended publish route env vars
- graceful shutdown handlers added for `SIGINT` and `SIGTERM`

## What is now considered go-live ready

The Slack app side is now packaged and operationally documented.

Still intentionally deferred until Step Four:

- durable persistence for postings/preview state (currently in-memory)
- webhook ingest endpoint implementation in Rails
- retry queue / dead letter strategy for failed webhook delivery

## Next step linkage

Step Four will implement the Rails ingest API and persistence layer that Step Two/Three now target.
