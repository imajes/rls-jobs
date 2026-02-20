const test = require('node:test');
const assert = require('node:assert/strict');

const { createAlerting } = require('../src/alerting');

function makeLogger() {
  const entries = [];
  return {
    entries,
    warn(message) {
      entries.push({ level: 'warn', message });
    },
    error(message) {
      entries.push({ level: 'error', message });
    },
  };
}

test('alerting dedupes repeated alerts within interval', async () => {
  const logger = makeLogger();
  let sends = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    sends += 1;
    return { ok: true, status: 200 };
  };

  try {
    const alerting = createAlerting({
      service: 'slack-app',
      logger,
      enabled: true,
      webhookUrl: 'https://example.test/webhook',
      minIntervalSeconds: 900,
    });

    const first = await alerting.emit({
      severity: 'warning',
      code: 'SLACK_API_READ_FALLBACK_ACTIVE',
      message: 'fallback active',
      fingerprint: 'local_store',
      context: { source: 'local_store' },
    });

    const second = await alerting.emit({
      severity: 'warning',
      code: 'SLACK_API_READ_FALLBACK_ACTIVE',
      message: 'fallback active',
      fingerprint: 'local_store',
      context: { source: 'local_store' },
    });

    assert.equal(first.deduped, false);
    assert.equal(second.deduped, true);
    assert.equal(sends, 1);
    assert.equal(logger.entries.filter((entry) => entry.message.includes('alert_event')).length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('alerting logs ALERT_DELIVERY_FAILED when webhook send fails', async () => {
  const logger = makeLogger();
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 500 });

  try {
    const alerting = createAlerting({
      service: 'slack-app',
      logger,
      enabled: true,
      webhookUrl: 'https://example.test/webhook',
      minIntervalSeconds: 900,
    });

    const result = await alerting.emit({
      severity: 'critical',
      code: 'SLACK_OUTBOX_DEAD_LETTERED',
      message: 'dead letter',
      context: { event_id: 'evt_1' },
    });

    assert.equal(result.sent, false);
    assert(logger.entries.some((entry) => entry.message.includes('ALERT_DELIVERY_FAILED')));
  } finally {
    global.fetch = originalFetch;
  }
});
