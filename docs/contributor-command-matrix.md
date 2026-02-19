# Contributor Command Matrix

This matrix is the local command baseline for both subprojects.

## Slack App (`/slack-app`)

- install dependencies: `npm ci`
- run app: `npm start`
- run tests: `npm test`
- run lint: `npm run lint`
- fix lint formatting: `npm run lint:fix`
- strict deploy checks: `npm run check:deploy`
- build Docker image: `docker build -t rls-jobs-slack-app:latest .`

## Jobs API (`/jobs-api`)

- verify runtime parity: `ruby -v` should match `.ruby-version` (`ruby-3.4.5`)
- migrate DB: `bin/rails db:migrate`
- run tests: `bin/rails test`
- run server: `bin/rails server`
- replay ingest failures (dry-run): `bin/rails rls:replay_ingest_failures`
- replay ingest failures (execute): `DRY_RUN=false bin/rails rls:replay_ingest_failures`

## CI workflows (repo root)

- Slack app CI: `.github/workflows/slack-app-ci.yml`
- Jobs API CI: `.github/workflows/jobs-api-ci.yml`
