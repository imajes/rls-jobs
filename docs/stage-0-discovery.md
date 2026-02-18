# Stage Zero - Slack Platform Discovery and Direction

Date: 2026-02-18

## Problem framing

Current job and candidate posts in Slack are free-form and inconsistent. Core discovery fields are often missing, making search and filtering difficult:

- Company
- Role
- Location constraints
- Compensation
- Visa sponsorship
- Poster relationship to role

## What I validated in Slack docs

Primary references reviewed:

- https://docs.slack.dev/tools/bolt-js/
- https://docs.slack.dev/reference/block-kit/blocks/
- https://docs.slack.dev/reference/block-kit/block-elements/
- https://docs.slack.dev/surfaces/modals/
- https://docs.slack.dev/interactivity/implementing-shortcuts/
- https://docs.slack.dev/interactivity/implementing-slash-commands/
- https://docs.slack.dev/reference/methods/chat.postMessage/
- https://docs.slack.dev/apis/web-api/rate-limits/
- https://docs.slack.dev/authentication/verifying-requests-from-slack/
- https://docs.slack.dev/tools/slack-cli/guides/using-slack-cli-with-bolt-frameworks/
- https://docs.slack.dev/reference/interaction-payloads/block_suggestion-payload/

Key constraints and capabilities to design around:

- Block Kit limits: max 50 blocks in a message, 100 in modals/Home tabs.
- Modals: `trigger_id` required to open and expires in 3 seconds.
- Interaction responses: commands/actions/options should be acknowledged within 3 seconds.
- `chat.postMessage`: provide top-level `text` fallback for accessibility; block content alone is insufficient for some screen readers.
- Message size guidance: target less than 4,000 chars in top-level text; hard truncation above 40,000 chars.
- Rate limits: `chat.postMessage` is effectively special tier, generally 1 message/second/channel with short bursts tolerated.
- Security: inbound requests from Slack must be verified with signing secret (`X-Slack-Signature`, timestamp validation).
- External select menus: `block_suggestion` supports up to 100 returned options/option groups.
- Slack CLI supports Bolt projects and manifest workflows; useful for consistent packaging and deployment.

## Framework decision for this project

Recommendation: keep Bolt for JavaScript (already bootstrapped), but harden architecture and conventions.

Why:

- It already supports the current Slack platform features needed here.
- It gives strong control over custom workflows, modal validation, and external API calls.
- It is a practical fit with your Rails backend and avoids unnecessary stack churn.
- Slack CLI + manifest support makes deployment and app config reproducible.

Implementation choice for next steps:

- Use Bolt with TypeScript-style structure (modular handlers/services), even if runtime stays Node.
- Keep manifest-driven config under source control.
- Keep request verification, auditability, and structured validation as first-class constraints.

## End-to-end architecture (target)

1. User triggers app via global shortcut (`Post job` / `Post candidate`) or slash command.
2. Slack app opens modal with required and optional structured fields.
3. On submit:
   - Validate and normalize values.
   - Post standardized Block Kit message into the configured channel.
   - Send canonical JSON payload to Rails API webhook for indexing/search.
4. Rails app stores both normalized fields and a source payload snapshot.
5. Rails UI provides filter/search/sort browsing views for jobs and candidates.
6. Auth bridge for Chatham-House constraints:
   - Slash command issues one-time signed URL.
   - URL redemption creates short-lived session (max TTL <= 1 hour absolute).
   - Session activity can slide expiry forward but never past absolute max.

## Data shape direction (shared language)

Two primary post types:

- `job_posting`
- `candidate_profile`

Both should capture:

- Slack metadata (`team_id`, `channel_id`, `message_ts`, poster user id, permalink if available)
- Source provenance (`submitted_via`, app version, submit timestamp)
- Freeform summary/body for edge cases
- Structured fields for querying

## Risks discovered early

- Over-collecting form fields will reduce submissions; must keep minimal + optional details.
- Without idempotency, retries could duplicate records.
- Channel posting failures and API ingestion failures should be decoupled (one can succeed while other retries).
- Accessibility regressions are easy if top-level `text` fallback is omitted.

## Questions that need answers before heavy implementation

- Which channel(s) should receive structured posts?
- Do we enforce full required fields for every post, or allow "minimum publishable" mode?
- Should anonymous company names be allowed (for stealth hiring), and if yes, how should they render/search?
- Should edits to Slack posts sync back to Rails records, or only capture initial submit?
- Any moderation/approval gate required before publishing to channel?

