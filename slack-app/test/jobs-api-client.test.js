const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthLink, postIntakeEvent } = require('../src/jobs-api-client');
const silentLogger = { warn() {} };

function makeConfig(overrides = {}) {
  return {
    jobsApi: {
      ingestUrl: 'https://api.rls.test/intake',
      authLinkUrl: 'https://api.rls.test/auth_links',
      token: 'shared-token',
      timeoutMs: '1000',
      ...overrides,
    },
  };
}

test('postIntakeEvent sends payload and authorization header', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { ok: true };
      },
    };
  };

  try {
    const result = await postIntakeEvent(makeConfig(), { eventType: 'slack_post_published' }, silentLogger);
    assert.equal(result.sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.rls.test/intake');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer shared-token');
  } finally {
    global.fetch = originalFetch;
  }
});

test('postIntakeEvent handles http/network failures', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500,
    async json() {
      return {};
    },
  });
  try {
    const httpResult = await postIntakeEvent(makeConfig(), { eventType: 'x' }, silentLogger);
    assert.equal(httpResult.sent, false);
    assert.equal(httpResult.reason, 'http_500');

    global.fetch = async () => {
      throw new Error('network down');
    };
    const networkResult = await postIntakeEvent(makeConfig(), { eventType: 'x' }, silentLogger);
    assert.equal(networkResult.sent, false);
    assert.equal(networkResult.reason, 'network_error');
  } finally {
    global.fetch = originalFetch;
  }
});

test('createAuthLink handles not_configured and invalid response', async () => {
  const notConfigured = await createAuthLink(makeConfig({ authLinkUrl: '' }), { slack_user_id: 'U1' }, silentLogger);
  assert.equal(notConfigured.sent, false);
  assert.equal(notConfigured.reason, 'not_configured');

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return { ok: true };
    },
  });

  try {
    const invalid = await createAuthLink(makeConfig(), { slack_user_id: 'U1' }, silentLogger);
    assert.equal(invalid.sent, false);
    assert.equal(invalid.reason, 'invalid_response');
  } finally {
    global.fetch = originalFetch;
  }
});

test('createAuthLink returns url and metadata on success', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        auth_url: 'https://jobs.rls.example/auth/slack/token',
        expires_at: '2026-02-20T08:00:00Z',
        ttl_seconds: 600,
      };
    },
  });

  try {
    const result = await createAuthLink(
      makeConfig(),
      { slack_user_id: 'U1', slack_team_id: 'T1', slack_user_name: 'james' },
      silentLogger,
    );
    assert.equal(result.sent, true);
    assert.equal(result.authUrl, 'https://jobs.rls.example/auth/slack/token');
    assert.equal(result.ttlSeconds, 600);
  } finally {
    global.fetch = originalFetch;
  }
});
