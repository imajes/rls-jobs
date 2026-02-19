# Step One - Jobs API Impact Notes

Date: 2026-02-18

## Why this exists

Step One was implemented in the Slack app only, but it establishes required input fields and channel-routing metadata that the Rails API must ingest in Step Four.

## New upstream field expectations from Slack UI

Common:

- channel routing recommendation output (captured post-intake from preview action context)
- `allow_thread_questions`
- `relationship`
- `visa_policy`
- `compensation_value`
- `compensation_components`

Job-specific:

- `company_name`
- `role_title`
- `employment_types` (multi-value)
- `location_summary`
- `work_arrangements` (multi-value)
- `skills`
- `summary`
- `links` (multi-link)

Candidate-specific:

- `headline`
- `availability_modes` (multi-value)
- `engagement_types` (multi-value)
- `compensation_disclosure`
- `links`
- `skills`
- `notes`

## Contract consequence

The `POST /api/v1/intake` payload in Step Four should preserve:

- normalized structured fields above
- routing recommendation output (channel focus key + reason)
- raw Slack view submission payload for auditability

## Deferred, but expected soon

- syncing edits and thread-derived enrichments back to canonical records
- account-age moderation fields (if moderation policy is adopted)
