const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
