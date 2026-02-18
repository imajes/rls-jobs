# Stage Zero - Slack App Design Notes

Date: 2026-02-18

## Current baseline

The existing `slack-app` is a sample custom workflow step template. It needs to evolve into a production Slack app for structured job and candidate intake.

## Entry points to support

- Global shortcut: `Post a job`
- Global shortcut: `Post availability`
- Slash command: `/rls-jobs-auth` (Step Six one-time portal login)

Optional future:

- Message shortcut: `Convert to structured post` for normalizing ad-hoc posts.

## Block Kit UX blueprint

Design principles:

- Minimal by default, with optional details sections.
- Fast to submit on mobile and desktop.
- Validation focuses on fields that materially improve discoverability.

### Job posting modal (initial)

Required:

- Company name
- Role title
- Location summary
- Work arrangement (`on-site`, `hybrid`, `remote`)
- Visa sponsorship (`yes`, `no`, `case-by-case`, `unknown`)
- Poster relationship (`hiring manager`, `works with hiring manager`, `recruiter`, `other`)

Optional:

- Compensation min/max + currency + interval (year/hour/contract)
- Team/department
- Tech stack tags
- Seniority
- Employment type
- Public job URL
- Notes

### Candidate availability modal (initial)

Required:

- Role target/title
- Location summary
- Work arrangement preference
- Candidate status (`actively interviewing`, `open to chat`, etc.)

Optional:

- Compensation target
- Skills/tags
- Resume/portfolio URL
- Visa/work authorization
- Timezone
- Notes

## Message render format

Each submit renders as one structured message with:

- Header section
- Compact key facts fields
- Optional details context
- CTA links (job URL, resume, etc.)
- Top-level fallback `text` for accessibility

## Manifest/scopes (target)

At minimum, expected bot scopes:

- `chat:write`
- `commands`
- `users:read` (if user metadata enrichment is needed)
- `channels:read` and/or `groups:read` only if needed for channel validation flows

Events:

- Keep minimal. Prefer interaction payloads over broad event subscriptions.

## Backend contract

After successful modal submission:

1. Post structured message in Slack.
2. Enqueue webhook call to Rails API with signed request.
3. Persist retry metadata and idempotency key.

Webhook payload should include:

- `kind` (`job_posting` or `candidate_profile`)
- Structured fields
- Slack metadata
- Raw input snapshot

## Reliability controls

- Acknowledge Slack interactions quickly, then do heavier work async.
- Verify inbound Slack signatures for every request.
- Use idempotency key (`team_id + user_id + view.id + submitted_at`) for API writes.
- Implement exponential backoff retries on webhook failures.
- Redact secrets and PII from logs where possible.

## Deliverables expected in Step One and Step Two

Step One:

- Modal builders, validation layer, and message block renderers for both post types.
- Clear field mapping and shared schemas.

Step Two:

- Submission flow handlers and API client integration.
- Retry-safe webhook delivery.
- Operational docs for environment variables and local testing.

