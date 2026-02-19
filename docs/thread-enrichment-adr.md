# ADR: Thread Enrichment Boundaries (Spec Only)

## Status
Accepted for planning. Implementation deferred.

## Context
RLS requires Chatham House-style protections while still improving job/candidate record quality. Thread replies can contain valuable updates (compensation clarifications, location changes, recruiting status), but they can also contain sensitive identity and context that should not be exposed broadly.

## Decision
Thread enrichment will be introduced in a future milestone with strict boundaries:

1. Ingestion boundary
- capture thread reply metadata only from job/candidate posting threads associated with known posting IDs
- ignore non-thread messages and replies outside managed posting threads

2. Identity protection model
- do not persist raw commenter profile fields for general browsing
- store stable hashed actor IDs for policy/abuse analysis only
- surface only poster-controlled/approved derived values in public browse UI

3. Allowed derived fields
- posting status changes (filled, paused, reopened)
- compensation clarifications
- location/work-arrangement corrections
- hiring-manager contact preference changes
- apply-link additions/removals

4. Restricted fields
- no automatic persistence of personal emails/phone numbers
- no unreviewed extraction of sensitive free-text claims
- no direct exposure of commenter identities in browse UI

5. Retention defaults
- derived thread enrichment events: retain 90 days
- raw captured thread snapshots (if retained for audit/debug): max 30 days
- resolved and replayed enrichment failures: retain 90 days

## Draft data shape

`thread_enrichment_events` (future)
- `posting_id` (FK to postings)
- `thread_ts`
- `message_ts`
- `event_type` (`thread_reply_created`, `thread_reply_updated`, `thread_reply_deleted`)
- `derived_changes` (JSON)
- `actor_hash`
- `source_payload` (JSON, restricted)
- `ingested_at`
- `retention_expires_at`

## Draft API contract

Future ingestion endpoint (internal):
- `POST /api/v1/thread_enrichment_events`

Envelope draft:
- `payloadVersion`
- `postingId`
- `teamId`
- `channelId`
- `threadTs`
- `messageTs`
- `eventType`
- `derivedChanges`
- `actorHash`
- `occurredAt`

## Moderation implications
- enrichment-derived changes affecting trust/safety should set moderation flags, not auto-publish high-risk changes.
- admin review queue should include enrichment-origin marker for auditability.

## Go/No-Go criteria for implementation

Go when:
- identity redaction policy approved
- retention jobs implemented and tested
- admin review flow for enrichment updates is available
- replay path for enrichment ingest failures is implemented

No-Go if:
- commenter identity leakage risk remains unresolved
- retention deletion guarantees are not verifiable
- moderation UX cannot distinguish enrichment vs original poster updates

