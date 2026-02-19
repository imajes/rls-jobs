const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAuthLink,
  getPosting,
  listPostings,
  postIntakeEvent,
  resolvePostingsUrl,
} = require('../src/jobs-api-client');
const silentLogger = { warn() {} };

function makeConfig(overrides = {}) {
  return {
    jobsApi: {
      ingestUrl: 'https://api.rls.test/intake',
      postingsUrl: 'https://api.rls.test/postings',
      authLinkUrl: 'https://api.rls.test/auth_links',
      token: 'shared-token',
      timeoutMs: '1000',
      readEnabled: true,
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

test('resolvePostingsUrl derives from ingest url when postings url missing', () => {
  const config = makeConfig({ postingsUrl: '' });
  assert.equal(resolvePostingsUrl(config), 'https://api.rls.test/postings');
});

test('listPostings fetches and maps response payload', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        ok: true,
        postings: [
          {
            external_posting_id: 'posting-1',
            kind: 'job_posting',
            status: 'active',
            values: { roleTitle: 'Engineer' },
            poster_user_id: 'U1',
            channel_id: 'C1',
            channel_focus: 'jobs',
            published_message_ts: '1.001',
            permalink: 'https://slack.test/p1',
            created_at: '2026-02-19T10:00:00Z',
            updated_at: '2026-02-19T10:30:00Z',
          },
        ],
      };
    },
  });

  try {
    const result = await listPostings(makeConfig(), { posterUserId: 'U1', status: 'active', limit: 10 }, silentLogger);
    assert.equal(result.fetched, true);
    assert.equal(result.postings.length, 1);
    assert.equal(result.postings[0].id, 'posting-1');
    assert.equal(result.postings[0].values.roleTitle, 'Engineer');
  } finally {
    global.fetch = originalFetch;
  }
});

test('getPosting returns mapped posting', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        ok: true,
        posting: {
          external_posting_id: 'posting-2',
          kind: 'candidate_profile',
          status: 'archived',
          values: { headline: 'Staff Security Engineer' },
          poster_user_id: 'U2',
          created_at: '2026-02-19T10:00:00Z',
          updated_at: '2026-02-19T11:00:00Z',
        },
      };
    },
  });

  try {
    const result = await getPosting(makeConfig(), 'posting-2', silentLogger);
    assert.equal(result.fetched, true);
    assert.equal(result.posting.kind, 'candidate_profile');
    assert.equal(result.posting.status, 'archived');
    assert.equal(result.posting.values.headline, 'Staff Security Engineer');
  } finally {
    global.fetch = originalFetch;
  }
});
