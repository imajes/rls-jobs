# RLS Jobs

Structured, searchable job and candidate posting infrastructure for the Rands Leadership Slack (RLS) workspace.

This repository contains two production-facing services:

1. `slack-app` (Node.js + Bolt)
- guides users through structured posting workflows in Slack
- publishes feed-friendly cards to jobs channels
- emits lifecycle events to the API (publish/update/archive)

2. `jobs-api` (Rails 8)
- ingests Slack lifecycle events and persists normalized records
- provides secure browse/admin UI and API endpoints
- supports moderation signals, cleanup workflows, and ops visibility

## Why This Exists

Unstructured posts in RLS are hard to search, hard to moderate, and quickly overwhelm jobs-related channels. RLS Jobs enforces a consistent intake shape while keeping posting lightweight for humans.

Core goals:
- make posts easier to discover and compare
- preserve poster intent and relationship context
- keep channel backscroll readable
- support trust/safety and operational reliability
- respect RLS-specific privacy expectations and operating norms

## Current Status

The project has completed the original staged plan plus Step 9 operational hardening.

Implemented themes:
- structured intake (jobs + candidate availability)
- smart channel routing with override controls
- poster-owned edit/archive lifecycle in Slack
- durable outbox retry/dead-letter ingest delivery
- protected Rails browse/admin experience with one-time Slack-auth bootstrap
- moderation soft-gate signals (non-blocking)
- dual-sink telemetry (structured logs + Slack ops alerts)
- beta isolation mode (`#rls-jobs-beta`) for controlled rollout

Deferred:
- thread enrichment implementation (ADR/planning only)
- hard moderation hold queue
- saved jobs / quick apply product features

## Architecture

```text
Slack User
  -> slack-app (modals, preview, publish)
    -> posts to Slack channels (#jobs, #remote-jobs, etc)
    -> writes lifecycle event to durable outbox
      -> jobs-api /api/v1/intake
        -> postings + intake_events + ingest_failures + ops_events
          -> browse UI (/postings) + admin UI (/admin, /admin/ops)
```

## Repository Layout

- `slack-app/`: Bolt for JavaScript app
- `jobs-api/`: Rails 8 API + UI
- `docs/`: project-level specs, ADRs, rollout notes
- `examples/`: visual references from real-world posting styles

## Quick Start

### Prerequisites

- Node.js 22+ (recommended for `slack-app`)
- Ruby `3.4.5` (matches `jobs-api/.ruby-version`)
- Bundler version compatible with the lockfile
- RLS workspace with app install/admin access

### 1. Start `jobs-api`

```zsh
cd jobs-api
bin/rails db:migrate
bin/rails server
```

### 2. Start `slack-app`

```zsh
cd slack-app
npm ci
cp .env.sample .env
npm start
```

### 3. Install/update Slack app manifest

Use `slack-app/manifest.json` in the RLS workspace, then verify:
- shortcuts exist
- slash commands exist
- `app_home_opened` event is enabled
- bot has required scopes (including `users:read`)

## Local Development Workflows

### Slack app

```zsh
cd slack-app
npm test
npm run lint
npm run check:deploy
```

### Jobs API

```zsh
cd jobs-api
bin/rails test
COVERAGE=1 bin/rails test
```

Coverage thresholds:

```zsh
cd jobs-api
COVERAGE=1 COVERAGE_MIN_LINES=75 COVERAGE_MIN_BRANCHES=60 bin/rails test
```

Additional command reference: `docs/contributor-command-matrix.md`.

## Configuration Overview

### Shared operational controls

- `RLS_OPERATION_MODE=normal|beta`
- `RLS_ALERTS_ENABLED=true|false`
- `RLS_ALERTS_SLACK_WEBHOOK_URL` (ops channel webhook)
- `RLS_ALERTS_MIN_INTERVAL_SECONDS` (dedupe/recovery interval)

### Slack app highlights

- channel mapping:
  - `RLS_CHANNEL_JOBS_ID`
  - `RLS_CHANNEL_ONSITE_JOBS_ID`
  - `RLS_CHANNEL_REMOTE_JOBS_ID`
  - `RLS_CHANNEL_JOBS_COFOUNDERS_ID`
  - `RLS_CHANNEL_JOBS_CONSULTING_ID`
  - `RLS_CHANNEL_JOBS_BETA_ID`
- ingest/API:
  - `RLS_JOBS_API_INGEST_URL`
  - `RLS_JOBS_API_POSTINGS_URL`
  - `RLS_JOBS_API_AUTH_LINK_URL`
  - `RLS_JOBS_API_TOKEN`
- reliability:
  - `RLS_OUTBOX_ENABLED`
  - `RLS_OUTBOX_PATH`
  - `RLS_OUTBOX_DEAD_PATH`
  - `RLS_INGEST_RETRY_MAX_ATTEMPTS`
  - `RLS_INGEST_RETRY_BASE_MS`
  - `RLS_OUTBOX_BACKLOG_WARN`
  - `RLS_OUTBOX_BACKLOG_CRITICAL`

### Jobs API highlights

- auth/API:
  - `RLS_JOBS_API_TOKEN`
  - `RLS_JOBS_WEB_BASE_URL`
  - `RLS_AUTH_LINK_TTL_SECONDS`
  - `RLS_ADMIN_SLACK_USER_IDS`
- beta/default scope:
  - `RLS_CHANNEL_JOBS_BETA_ID`
- ops thresholds:
  - `RLS_INGEST_FAILURE_WARN`
  - `RLS_INGEST_FAILURE_CRITICAL`
  - `RLS_AUTH_LINK_ERROR_WARN`
  - `RLS_INTAKE_VALIDATION_ERROR_WARN`

## Slack UX Surface

Main user entry points:
- `/rls-jobs-intake` and `/rls-job-intake`
- global shortcuts for job/candidate posting
- app home management controls

Operational commands:
- `/rls-jobs-auth` and `/rls-job-auth`
- `/rls-jobs-health` and `/rls-job-health`

## Security and Trust Model

- one-time auth links are digest-stored and single-use
- browse/admin web sessions enforce max lifetime and idle expiry
- moderation is soft-gate in current phase (flag, notify, review; no posting block)
- beta mode provides channel-level blast-radius control during rollout
- data handling and access controls are tailored to RLS usage boundaries

## Reliability and Ops

Current reliability posture:
- Slack lifecycle events are queued to a durable outbox
- retry/backoff with dead-letter behavior protects against API outages
- API and Slack emit structured alerts, with webhook fan-out to ops channel
- `/admin/ops` and `/api/v1/ops/summary` provide triage surfaces

Recommended ops alert destination: `#rls-jobs-bot-ops`.

## Deployment Notes

- `slack-app` runs in Socket Mode; no inbound HTTP listener is required
- mount persistent storage for Slack outbox files (`/app/storage`)
- deploy jobs-api migrations before enabling new Step 9 features
- roll out in windows (outbox -> API reads -> moderation notifications -> strict thresholds)

Detailed rollout guide: `docs/step-9-ops-rollout-telemetry-beta-mode.md`.

## Documentation Map

Start here:
- `docs/original-spec.md`
- `docs/stage-0-discovery.md`

Key implementation docs:
- `docs/step-3-package-and-deploy.md`
- `docs/step-6-rls-auth-flow.md`
- `docs/step-8-reliability-trust-data-hardening.md`
- `docs/step-9-ops-rollout-telemetry-beta-mode.md`
- `docs/domain-model-and-data-shape.md`

ADRs:
- `docs/adr/ADR-step-9-ops-telemetry-beta-mode.md`
- `docs/thread-enrichment-adr.md`

Subproject docs:
- `slack-app/docs/`
- `jobs-api/docs/`

## Contribution Expectations

- favor small, testable changes with clear rollback paths
- preserve RLS privacy assumptions and avoid broadening scope beyond the RLS workspace
- prefer reliability-first changes over feature expansion when tradeoffs conflict
- keep docs current when modifying runtime behavior or operational controls
