# Step One - Slack App Block Kit Implementation

Date: 2026-02-18

## Summary

The previous sample `sample_step` app was replaced with a modular Bolt app that provides structured intake modals for job posts and candidate posts.

This was later iterated with a prototype-first workflow. The current app now reflects those prototype decisions:

- guided 3-step modal flow for jobs and candidates
- richer summary cards for feed-style scanning
- full-details opened in modal surface
- channel routing moved to preview overflow actions

## New Slack entry points

- Global shortcut: `post_job_shortcut`
- Global shortcut: `post_candidate_shortcut`
- Slash command: `/rls-jobs-intake`
  - accepts optional command text:
    - `job`
    - `candidate` / `profile` / `availability`

## Required field strategy

Derived from the recurring Slackbot reminder and screenshot analysis.

### Job modal required inputs

- company name (unless stealth checkbox selected)
- role title
- employment type
- location
- work arrangement
- compensation disclosure status
- visa sponsorship
- poster relationship
- channel focus mode

### Candidate modal required inputs

- target role(s)
- location
- work arrangement preference
- availability status
- compensation disclosure status
- visa/work authorization context
- poster relationship
- channel focus mode

## Optional fields

Job:

- compensation detail text
- job URL
- skills
- role summary
- thread question preference

Candidate:

- compensation target
- links
- skills
- notes
- thread reply preference

## Channel recommendation heuristics

Order of precedence:

1. Explicit channel override
2. Cofounder indicators
3. Consulting/contract indicators
4. Work arrangement (`remote`, `onsite`, `hybrid`)
5. Keyword fallback
6. Default `#jobs`

## Validation behavior

Implemented with Slack inline modal errors (`response_action: errors`):

- required field checks
- stealth-company exemption for company field
- compensation-details requirement when "range provided" is selected
- URL validation for job link and candidate links

## Step One runtime behavior

On successful submit:

- app computes recommended channel focus
- app sends a DM preview to submitter with compact card summary and actions
- no channel publish and no API call yet (Step Two scope)

## Environment additions

Optional routing channel IDs:

- `RLS_CHANNEL_JOBS_ID`
- `RLS_CHANNEL_ONSITE_JOBS_ID`
- `RLS_CHANNEL_REMOTE_JOBS_ID`
- `RLS_CHANNEL_JOBS_COFOUNDERS_ID`
- `RLS_CHANNEL_JOBS_CONSULTING_ID`

These are used only for preview visibility in Step One.

## Files of note

- `slack-app/app.js`
- `slack-app/src/app.js`
- `slack-app/src/handlers.js`
- `slack-app/src/modals.js`
- `slack-app/src/validation.js`
- `slack-app/src/channel-routing.js`
- `slack-app/manifest.json`

## Known deferrals

- Auto moderation for new Slack accounts (queued for architecture/product design).
- API ingestion and real channel publishing (Step Two).
- Thread enrichment syncing from replies (later step).
