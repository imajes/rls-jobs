const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { IngestOutbox, buildEventId } = require('../src/ingest-outbox');

function makePaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rls-outbox-'));
  return {
    dir,
    outboxPath: path.join(dir, 'ingest-outbox.ndjson'),
    deadPath: path.join(dir, 'ingest-outbox.dead.ndjson'),
  };
}

test('buildEventId is deterministic for equivalent payload objects', () => {
  const a = { eventType: 'slack_post_published', values: { roleTitle: 'Engineer', companyName: 'Pied Piper' } };
  const b = { values: { companyName: 'Pied Piper', roleTitle: 'Engineer' }, eventType: 'slack_post_published' };

  assert.equal(buildEventId(a), buildEventId(b));
});

test('outbox immediate success does not leave queued records', async () => {
  const { dir, outboxPath, deadPath } = makePaths();
  const outbox = new IngestOutbox({
    enabled: true,
    outboxPath,
    deadPath,
    flushIntervalMs: 1000,
    retryMaxAttempts: 10,
    retryBaseMs: 1,
    logger: { error() {}, warn() {} },
    deliver: async () => ({ sent: true }),
  });

  try {
    const result = await outbox.enqueueAndDeliver({ postingId: 'posting-1', eventType: 'slack_post_published' });
    assert.equal(result.sent, true);
    assert.equal(result.queued, false);
    assert.equal(outbox.queueSize(), 0);

    const contents = fs.readFileSync(outboxPath, 'utf8').trim();
    assert.equal(contents, '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('outbox retries and dead-letters after max attempts', async () => {
  const { dir, outboxPath, deadPath } = makePaths();
  let attempts = 0;
  let deadLettered = 0;
  const outbox = new IngestOutbox({
    enabled: true,
    outboxPath,
    deadPath,
    flushIntervalMs: 1000,
    retryMaxAttempts: 2,
    retryBaseMs: 0,
    logger: { error() {}, warn() {} },
    onDeadLetter: () => {
      deadLettered += 1;
    },
    deliver: async () => {
      attempts += 1;
      return { sent: false, reason: 'http_500' };
    },
  });

  try {
    const result = await outbox.enqueueAndDeliver({ postingId: 'posting-2', eventType: 'slack_post_updated' });
    assert.equal(result.sent, true);
    assert.equal(outbox.queueSize(), 1);

    for (const record of outbox.queue.values()) {
      record.next_attempt_at = 0;
    }
    await outbox.flushDue();

    assert.equal(attempts, 2);
    assert.equal(outbox.queueSize(), 0);
    assert.equal(deadLettered, 1);
    assert.equal(outbox.deadLetterCount(), 1);
    assert.notEqual(outbox.lastFlushAt(), '');

    const outboxContents = fs.readFileSync(outboxPath, 'utf8').trim();
    assert.equal(outboxContents, '');

    const deadContents = fs.readFileSync(deadPath, 'utf8').trim();
    assert.notEqual(deadContents, '');
    assert.match(deadContents, /posting-2/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
