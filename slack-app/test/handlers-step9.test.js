const test = require('node:test');
const assert = require('node:assert/strict');

const { registerHandlers } = require('../src/handlers');
const { createPreview } = require('../src/preview-store');
const { POST_KIND } = require('../src/constants');

function buildConfig(overrides = {}) {
  return {
    appToken: 'xapp-test',
    botToken: 'xoxb-test',
    logLevel: 'INFO',
    operationMode: 'normal',
    channelIds: {
      jobs: 'CJOBS',
      onsiteJobs: 'CONSITE',
      remoteJobs: 'CREMOTE',
      jobsCofounders: 'CCOFOUNDERS',
      jobsConsulting: 'CCONSULTING',
      jobsBeta: 'CBETA',
    },
    jobsApi: {
      ingestUrl: '',
      postingsUrl: '',
      authLinkUrl: '',
      token: '',
      timeoutMs: 5000,
      readEnabled: false,
    },
    outbox: {
      enabled: false,
      path: 'storage/ingest-outbox.ndjson',
      deadPath: 'storage/ingest-outbox.dead.ndjson',
      flushIntervalMs: 15000,
      retryMaxAttempts: 10,
      retryBaseMs: 1000,
      backlogWarn: 25,
      backlogCritical: 100,
    },
    moderation: {
      enabled: false,
      newAccountDays: 14,
      modQueueChannelId: '',
    },
    cache: {
      postingsTtlMs: 60000,
    },
    alerts: {
      enabled: false,
      slackWebhookUrl: '',
      minIntervalSeconds: 900,
    },
    ...overrides,
  };
}

function buildApp() {
  const commands = new Map();
  const actions = new Map();
  const views = new Map();
  const shortcuts = new Map();
  const events = new Map();

  const logger = {
    info() {},
    warn() {},
    error() {},
  };

  return {
    logger,
    command(name, handler) {
      commands.set(name, handler);
    },
    action(name, handler) {
      actions.set(name, handler);
    },
    view(name, handler) {
      views.set(name, handler);
    },
    shortcut(name, handler) {
      shortcuts.set(name, handler);
    },
    event(name, handler) {
      events.set(name, handler);
    },
    commands,
    actions,
    views,
    shortcuts,
    events,
  };
}

function buildClient() {
  const posts = [];
  const opens = [];

  return {
    posts,
    opens,
    chat: {
      async postMessage(payload) {
        posts.push(payload);
        return { ts: String(1700000000 + posts.length) };
      },
      async getPermalink() {
        return { permalink: 'https://slack.example/permalink' };
      },
      async update() {
        return { ok: true };
      },
    },
    views: {
      async open(payload) {
        opens.push(payload);
        return { ok: true };
      },
      async publish() {
        return { ok: true };
      },
    },
    users: {
      async info() {
        return { user: { created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 365 } };
      },
    },
  };
}

test.afterEach((context) => {
  const app = context.app;
  if (app?.__rlsOutboxMonitor) {
    app.__rlsOutboxMonitor.stop();
  }
  if (app?.__rlsOutbox) {
    app.__rlsOutbox.stop();
  }
});

test('beta mode rejects intake command outside beta channel', async (context) => {
  const app = buildApp();
  context.app = app;
  registerHandlers(app, buildConfig({ operationMode: 'beta' }));

  const client = buildClient();

  await app.commands.get('/rls-jobs-intake')({
    ack: async () => {},
    command: {
      user_id: 'U1',
      channel_id: 'CNOTBETA',
      text: 'job',
      trigger_id: 'TR1',
    },
    client,
    logger: app.logger,
  });

  assert.equal(client.opens.length, 0);
  assert.equal(client.posts.length, 1);
  assert.match(client.posts[0].text, /Beta mode is enabled/);
});

test('beta mode allows shortcuts and forces publish route to beta channel', async (context) => {
  const app = buildApp();
  context.app = app;
  registerHandlers(app, buildConfig({ operationMode: 'beta' }));

  const client = buildClient();

  await app.shortcuts.get('post_job_shortcut')({
    ack: async () => {},
    body: { trigger_id: 'TR2' },
    client,
    logger: app.logger,
  });

  assert.equal(client.opens.length, 1);

  const previewId = createPreview(
    POST_KIND.JOB,
    {
      roleTitle: 'Senior Engineer',
      companyName: 'Hooli',
      locationSummary: 'Remote',
      summary: 'Build systems',
      posterUserId: 'U1',
    },
    { key: 'remote_jobs', reason: 'manual_test' },
    'CREMOTE',
  );

  await app.actions.get('job_card_publish')({
    ack: async () => {},
    body: {
      user: { id: 'U1' },
      team: { id: 'T1' },
      actions: [{ value: previewId }],
      container: {
        channel_id: 'DU1',
        message_ts: '171111.100',
      },
    },
    client,
    logger: app.logger,
  });

  assert.equal(client.posts[0].channel, 'CBETA');
});

test('health command returns expected status fields', async (context) => {
  const app = buildApp();
  context.app = app;
  registerHandlers(app, buildConfig({ operationMode: 'beta' }));

  let ackPayload;
  await app.commands.get('/rls-jobs-health')({
    ack: async (payload) => {
      ackPayload = payload;
    },
  });

  assert.equal(ackPayload.response_type, 'ephemeral');
  assert.match(ackPayload.text, /Outbox queue/);
  assert.match(ackPayload.text, /Operation mode: beta/);
  assert.match(ackPayload.text, /Alerting mode/);
});

test('outbox backlog alert emits and then recovers after interval', async (context) => {
  const originalFetch = global.fetch;
  const sentAlerts = [];
  global.fetch = async (_url, options) => {
    sentAlerts.push(JSON.parse(options.body));
    return { ok: true, status: 200 };
  };

  const app = buildApp();
  context.app = app;
  registerHandlers(
    app,
    buildConfig({
      alerts: {
        enabled: true,
        slackWebhookUrl: 'https://example.test/webhook',
        minIntervalSeconds: 1,
      },
      outbox: {
        enabled: false,
        path: 'storage/ingest-outbox.ndjson',
        deadPath: 'storage/ingest-outbox.dead.ndjson',
        flushIntervalMs: 15000,
        retryMaxAttempts: 10,
        retryBaseMs: 1000,
        backlogWarn: 1,
        backlogCritical: 100,
      },
    }),
  );

  try {
    app.__rlsOutbox.queue.set('evt_test', { event_id: 'evt_test' });
    await app.__rlsOutboxMonitor.check();

    app.__rlsOutbox.queue.clear();
    await app.__rlsOutboxMonitor.check();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await app.__rlsOutboxMonitor.check();

    assert.equal(sentAlerts.length, 2);
    assert.match(sentAlerts[0].text, /SLACK_OUTBOX_BACKLOG_HIGH/);
    assert.match(sentAlerts[1].text, /SLACK_OUTBOX_BACKLOG_HIGH_RECOVERED/);
  } finally {
    global.fetch = originalFetch;
  }
});
