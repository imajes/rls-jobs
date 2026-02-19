# Step Seven - Slack App Test Suite Expansion

Date: 2026-02-19

## Added test runner

- `npm test` -> `node --test test/*.test.js`
- `npm run test:coverage` -> Node test coverage mode
- `npm run test:coverage:check` -> enforce line/function/branch thresholds

## Added test modules

- `test/channel-routing.test.js`
- `test/validation.test.js`
- `test/stores.test.js`
- `test/jobs-api-client.test.js`
- `test/config.test.js`

## Coverage intent

These tests target high-risk logic where regressions have direct user impact:

- routing recommendations and channel mapping
- required field + link validation
- preview/posting state transitions
- webhook/auth-link API client behavior under network and HTTP failures
- env var readiness checks

## Current result

- all Slack app tests pass locally
- lint passes with test files included
