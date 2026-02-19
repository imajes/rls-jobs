# Step Three - Jobs API Readiness Note

Date: 2026-02-19

Step Three focused on packaging/deploying the Slack app.

Current implication for `jobs-api`:

- Slack app can now optionally emit webhook publish events to `RLS_JOBS_API_INGEST_URL`.
- No Rails ingest endpoint has been implemented yet, so webhook delivery should remain disabled in production until Step Four begins.

Recommended temporary production setting:

- leave `RLS_JOBS_API_INGEST_URL` unset

This avoids noisy failed webhook attempts before ingest is available.
