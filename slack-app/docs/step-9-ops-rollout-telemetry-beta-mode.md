# Step 9 (Slack App): Ops Telemetry + Beta Isolation

## Implemented

1. Dual-sink alert transport:
- Structured alert logs are always emitted.
- Slack webhook delivery is attempted when enabled.
- Transport failures emit `ALERT_DELIVERY_FAILED` log entries.

2. Alert sources:
- Outbox dead-letter (`SLACK_OUTBOX_DEAD_LETTERED`, critical).
- Outbox backlog threshold (`SLACK_OUTBOX_BACKLOG_HIGH`, warning/critical).
- Outbox backlog recovery (`SLACK_OUTBOX_BACKLOG_HIGH_RECOVERED`).
- API-read fallback (`SLACK_API_READ_FALLBACK_ACTIVE`, warning).

3. Health command:
- `/rls-jobs-health`
- `/rls-job-health`

Returns:
- outbox queue size
- dead-letter count
- last flush timestamp
- API read mode
- moderation mode
- alerting mode
- operation mode

4. Beta isolation behavior:
- `RLS_OPERATION_MODE=beta` forces publish route to `#rls-jobs-beta` (`RLS_CHANNEL_JOBS_BETA_ID`).
- Route override controls are hidden in preview cards.
- Intake slash command is rejected outside beta channel with guidance.
- Global shortcuts remain available; publish route is still forced to beta.

## Env Vars Added/Used

- `RLS_OPERATION_MODE=normal|beta`
- `RLS_CHANNEL_JOBS_BETA_ID`
- `RLS_ALERTS_ENABLED`
- `RLS_ALERTS_SLACK_WEBHOOK_URL`
- `RLS_ALERTS_MIN_INTERVAL_SECONDS`
- `RLS_OUTBOX_BACKLOG_WARN`
- `RLS_OUTBOX_BACKLOG_CRITICAL`

## Notes

- Webhook channel destination should be configured to `#rls-jobs-bot-ops`.
- Log output is the source of truth for all alert events.
- Outbox durability still requires persistent `/app/storage` volume mount.
