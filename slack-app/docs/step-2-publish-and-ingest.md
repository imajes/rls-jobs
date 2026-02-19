# Step Two - Slack Publish and Webhook Flow

Date: 2026-02-19

## Runtime flow

1. user completes guided modal (job or candidate)
2. app creates in-memory preview record
3. app DMs preview card with:
   - `Publish`
   - `Open Details`
   - route overflow selector
4. optional route override updates preview route state
5. `Publish` posts a compact feed-friendly card to the selected channel
6. app sends webhook payload to configured jobs API endpoint (optional)
7. app records posting for App Home ownership workflows

## New actions

- `job_card_publish`
- `candidate_card_publish`
- `published_post_edit`
- `published_post_archive`
- `job_published_open_details`
- `candidate_published_open_details`

Route actions now update preview state:

- `job_card_route_channel`
- `candidate_card_route_channel`

App Home event:

- `app_home_opened` renders "Your RLS Postings"

Slash command intake entry:

- `/rls-jobs-intake` opens an intake-type chooser by default
- `/rls-job-intake` alias is supported for typo tolerance
- optional command text still supports direct jumps (`job`, `candidate`, `availability`)

## Files changed

- `slack-app/src/preview-store.js`
  - stores `channelFocus`
  - stores published route history
  - adds route update and duplicate-route checks
- `slack-app/src/preview-messages.js`
  - adds `Publish` actions in preview cards
  - adds channel post builders:
    - `jobPublishedMessage`
    - `candidatePublishedMessage`
- `slack-app/src/handlers.js`
  - route update persistence
  - publish action handlers
  - optional webhook dispatch
- `slack-app/src/jobs-api-client.js`
  - webhook sender with timeout and bearer auth support
- `slack-app/src/posting-store.js`
  - in-memory posting ownership and status tracking
- `slack-app/src/posting-edit-modals.js`
  - poster edit modals for job/candidate postings
- `slack-app/src/app-home.js`
  - App Home rendering for listing and managing poster records
- `slack-app/src/config.js`
  - jobs API env config parsing
- `slack-app/.env.sample`
  - jobs API env keys

## Webhook payload shape

High-level envelope sent on publish:

- `eventType`
- `kind`
- `previewId`
- `postedAt`
- `route`
  - `channelFocus`
  - `channelId`
  - `channelLabel`
- `slack`
  - `teamId`
  - `previewDmChannelId`
  - `previewDmMessageTs`
  - `publishedMessageTs`
  - `publishedByUserId`
- `values`
  - structured intake fields from modal

## Operational notes

- Publish requires destination channel IDs to be configured (`RLS_CHANNEL_*` env vars).
- If bot is not a member of a private channel, publish will fail at Slack API level.
- Duplicate publish to the same route is blocked per preview ID.
- Webhook failures are logged and do not block channel posting.
- Edit/archive actions are restricted to the original poster.
