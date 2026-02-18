# Stage Zero - Jobs API Ingestion Contract (Draft)

Date: 2026-02-18

## Goal

Define a durable contract for ingesting structured Slack submissions from the Slack app so records are searchable and auditable.

## Proposed endpoints

- `POST /api/v1/intake`
  - Accepts `job_posting` and `candidate_profile` payloads.
  - Secured with shared secret signature header.
  - Idempotent on `external_id`.

- `POST /auth/slack/redeem`
  - Redeems one-time token from `/rls-jobs-auth` link flow.
  - Creates short-lived session with strict max TTL of 1 hour.

## Suggested payload envelope

```json
{
  "external_id": "T123-U456-V789-20260218T200102Z",
  "kind": "job_posting",
  "submitted_at": "2026-02-18T20:01:02Z",
  "source": {
    "platform": "slack",
    "team_id": "T123",
    "channel_id": "C123",
    "user_id": "U123",
    "message_ts": "1739912212.123456",
    "permalink": "https://...",
    "app_version": "1.0.0"
  },
  "data": {
    "company_name": "Example Inc",
    "role_title": "Senior Backend Engineer",
    "location_summary": "Remote (US timezones)",
    "work_arrangement": "remote",
    "visa_sponsorship": "no",
    "poster_relationship": "hiring_manager",
    "compensation_min": 170000,
    "compensation_max": 220000,
    "currency": "USD",
    "compensation_interval": "year",
    "skills": ["ruby", "postgresql", "aws"],
    "description": "..."
  },
  "raw": {
    "view_submission": {}
  }
}
```

## Data model direction

Core tables:

- `postings`
  - Shared fields across both posting kinds.
  - Includes Slack provenance, text summary, timestamps, dedupe key.

- `job_posting_details`
  - Job-specific structured fields.

- `candidate_profile_details`
  - Candidate-specific structured fields.

- `auth_links`
  - One-time auth token hash, expires_at, consumed_at, slack user/team metadata.

- `sessions`
  - Linked to redeemed auth link, `started_at`, `last_seen_at`, `hard_expires_at`.

Indexing priorities:

- `kind`
- `company_name`
- `role_title`
- `location_summary`
- `work_arrangement`
- `visa_sponsorship`
- `created_at`
- Full-text index on normalized description/notes fields

## Security and integrity controls

- Verify webhook signatures using HMAC SHA-256 and timestamp replay protection.
- Store only hashed one-time auth tokens in DB.
- Enforce single-use redemption with transactional update.
- Set absolute session max expiry at creation (`hard_expires_at = now + 1 hour`) and never extend beyond that.
- Keep raw source payload for audit/debug, with sensitive-field filtering where needed.

## UI implications for Step Five

Filters needed from day one:

- Kind (job/candidate)
- Role title
- Company
- Location
- Work arrangement
- Visa sponsorship
- Compensation presence/range
- Date range
- Free-text search

## Open decisions

- Should records ever be soft-deleted, or strictly append-only with hidden flags?
- Should Slack poster display names be denormalized for faster browsing?
- Do we need channel-level access controls in UI from first release?

