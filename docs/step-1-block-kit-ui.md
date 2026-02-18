# Step One - Structured Block Kit UI

Date: 2026-02-18

## Outcome

Implemented a production-shaped Block Kit intake UI in `slack-app` for:

- Job postings
- Candidate availability postings

This replaced the sample custom workflow step template with real Slack interaction entry points and strict field validation.

## Inputs used to define strict fields

- Recurring Slackbot reminder fields:
  - company
  - role
  - location
  - compensation
  - visa
  - relationship to role
- Screenshot examples from `examples/jobs` and `examples/applicants`:
  - highly variable post styles (short, long, bulleted, linked, no-link)
  - frequent ambiguity on compensation/visa/work arrangement
  - thread replies are socially meaningful follow-up context

## Strict required fields (implemented)

### Job posting

- company name (or explicit stealth toggle)
- role title
- employment type
- location summary
- work arrangement
- compensation disclosure status
- visa sponsorship status
- poster relationship to role
- channel focus (`auto` or explicit override)

### Candidate profile

- target role(s)
- location summary
- work arrangement preference
- availability status
- compensation disclosure status
- work authorization / visa context
- poster relationship
- channel focus (`auto` or explicit override)

## Smart channel recommendation model (implemented)

Target channels:

- `#jobs`
- `#onsite-jobs`
- `#remote-jobs`
- `#jobs-cofounders`
- `#jobs-consulting`

Routing heuristic:

- explicit override wins
- cofounder signals -> `#jobs-cofounders`
- contract/consulting signals -> `#jobs-consulting`
- remote preference -> `#remote-jobs`
- onsite/hybrid -> `#onsite-jobs`
- fallback -> `#jobs`

## UX choices

- Minimal modal chrome, with optional detail fields.
- Inline validation errors for strict fields.
- Explicit compensation disclosure even when range is not listed.
- Stealth company support via checkbox and company field exemption.
- Thread openness captured explicitly to support later thread-enhancement work.

## Deliberately deferred (documented)

- New-account moderation queue / account-age gate:
  - parked in product architecture backlog for later evaluation.
- Channel posting and API persistence:
  - deferred to Step Two.

## Files added/changed (Step One)

Slack app implementation:

- `slack-app/src/app.js`
- `slack-app/src/handlers.js`
- `slack-app/src/modals.js`
- `slack-app/src/validation.js`
- `slack-app/src/submit-parsing.js`
- `slack-app/src/channel-routing.js`
- `slack-app/src/preview-messages.js`
- `slack-app/src/view-state.js`
- `slack-app/src/block-kit.js`
- `slack-app/src/config.js`
- `slack-app/src/constants.js`
- `slack-app/src/field-ids.js`
- `slack-app/manifest.json`
- `slack-app/.env.sample`
- `slack-app/README.md`

## Validation status

- Biome check passed in `slack-app` with local binary:
  - `./node_modules/.bin/biome check .`

Note: `npm run lint` initially failed due local npm cache permissions under `~/.npm`; resolved for local work by using a writable cache path during install.
