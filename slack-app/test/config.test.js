const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getConfig,
  getMissingRecommendedAuthEnv,
  getMissingRecommendedPublishEnv,
  getMissingRequiredEnv,
} = require('../src/config');

const ORIGINAL_ENV = { ...process.env };

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('required env detection works', () => {
  delete process.env.SLACK_APP_TOKEN;
  delete process.env.SLACK_BOT_TOKEN;

  const missing = getMissingRequiredEnv();
  assert.equal(missing.includes('SLACK_APP_TOKEN'), true);
  assert.equal(missing.includes('SLACK_BOT_TOKEN'), true);
});

test('recommended env detection covers publish + auth vars', () => {
  delete process.env.RLS_CHANNEL_JOBS_ID;
  delete process.env.RLS_CHANNEL_ONSITE_JOBS_ID;
  delete process.env.RLS_CHANNEL_REMOTE_JOBS_ID;
  delete process.env.RLS_CHANNEL_JOBS_COFOUNDERS_ID;
  delete process.env.RLS_CHANNEL_JOBS_CONSULTING_ID;
  delete process.env.RLS_JOBS_API_AUTH_LINK_URL;

  const publishMissing = getMissingRecommendedPublishEnv();
  const authMissing = getMissingRecommendedAuthEnv();

  assert.equal(publishMissing.length >= 5, true);
  assert.deepEqual(authMissing, ['RLS_JOBS_API_AUTH_LINK_URL']);
});

test('getConfig parses feature flags and retry settings', () => {
  process.env.RLS_API_READ_ENABLED = 'true';
  process.env.RLS_OUTBOX_ENABLED = '1';
  process.env.RLS_INGEST_RETRY_MAX_ATTEMPTS = '7';
  process.env.RLS_INGEST_RETRY_BASE_MS = '250';
  process.env.RLS_MODERATION_ENABLED = 'true';
  process.env.RLS_NEW_ACCOUNT_DAYS = '21';
  process.env.RLS_OUTBOX_PATH = 'tmp/custom-outbox.ndjson';
  process.env.RLS_OUTBOX_DEAD_PATH = 'tmp/custom-dead.ndjson';

  const config = getConfig();
  assert.equal(config.jobsApi.readEnabled, true);
  assert.equal(config.outbox.enabled, true);
  assert.equal(config.outbox.retryMaxAttempts, 7);
  assert.equal(config.outbox.retryBaseMs, 250);
  assert.equal(config.outbox.path, 'tmp/custom-outbox.ndjson');
  assert.equal(config.outbox.deadPath, 'tmp/custom-dead.ndjson');
  assert.equal(config.moderation.enabled, true);
  assert.equal(config.moderation.newAccountDays, 21);
});
