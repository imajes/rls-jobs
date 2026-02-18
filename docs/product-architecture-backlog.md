# Product and Architecture Backlog

Date: 2026-02-18

## Pending: New-account moderation policy

Status: parked (not implemented yet)

Context:

- Concern about abuse/spam from very new Slack accounts.
- Unclear whether this is needed in practice.

Candidate approaches:

1. Soft gate
   - Allow posting.
   - Tag posts with `new_account=true` metadata.
   - Optionally send moderator signal.

2. Hard gate
   - Hold posts from accounts younger than threshold (for example 14 or 30 days).
   - Route to moderation queue for manual release.

3. Risk-scored gate
   - Use account age + workspace history signals.
   - Hold only higher-risk submissions.

Data requirements if pursued:

- Slack `user.created` timestamp (or equivalent user profile signal).
- policy threshold config
- moderator audit trail and release action

Decision needed before implementation:

- whether to gate at all
- account age threshold
- who moderates and expected SLA
