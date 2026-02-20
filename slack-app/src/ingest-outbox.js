const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }

  return value;
}

function buildEventId(payload) {
  const canonicalPayload = canonicalize(payload || {});
  const digest = createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
  return `evt_${digest.slice(0, 32)}`;
}

function jitteredDelay(baseDelayMs) {
  const jitter = Math.floor(baseDelayMs * 0.2 * Math.random());
  return baseDelayMs + jitter;
}

class IngestOutbox {
  constructor({
    enabled,
    outboxPath,
    deadPath,
    flushIntervalMs,
    retryMaxAttempts,
    retryBaseMs,
    deliver,
    logger,
    onDeadLetter,
  }) {
    this.enabled = Boolean(enabled);
    this.outboxPath = path.resolve(process.cwd(), outboxPath);
    this.deadPath = path.resolve(process.cwd(), deadPath);
    this.flushIntervalMs = Number(flushIntervalMs || 15000);
    this.retryMaxAttempts = Number(retryMaxAttempts || 10);
    this.retryBaseMs = Number(retryBaseMs || 1000);
    this.deliver = deliver;
    this.logger = logger;
    this.onDeadLetter = onDeadLetter;
    this.queue = new Map();
    this.timer = null;
    this.flushing = false;
    this.initialized = false;
    this.deadLetterCountValue = 0;
    this.lastFlushAtValue = '';
  }

  ensureInitialized() {
    if (!this.enabled || this.initialized) {
      return;
    }

    fs.mkdirSync(path.dirname(this.outboxPath), { recursive: true });
    fs.mkdirSync(path.dirname(this.deadPath), { recursive: true });

    if (!fs.existsSync(this.outboxPath)) {
      fs.writeFileSync(this.outboxPath, '', 'utf8');
    }

    if (!fs.existsSync(this.deadPath)) {
      fs.writeFileSync(this.deadPath, '', 'utf8');
    }

    this.deadLetterCountValue = fs
      .readFileSync(this.deadPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;

    const raw = fs.readFileSync(this.outboxPath, 'utf8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record?.event_id) {
          this.queue.set(record.event_id, record);
        }
      } catch (_error) {
        // Skip malformed line and continue loading remaining records.
      }
    }

    this.initialized = true;
  }

  start() {
    if (!this.enabled) {
      return;
    }

    this.ensureInitialized();

    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.flushDue().catch((error) => this.logger?.error?.('outbox_flush_failed', error));
    }, this.flushIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enqueueAndDeliver(payload) {
    if (!this.enabled) {
      return this.deliver(payload);
    }

    this.ensureInitialized();

    const eventId = buildEventId(payload);
    const existing = this.queue.get(eventId);
    const now = Date.now();

    const record = existing || {
      event_id: eventId,
      payload,
      attempts: 0,
      next_attempt_at: now,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      last_error: '',
    };

    this.queue.set(eventId, record);
    this.persistQueue();

    const delivery = await this.deliverRecord(record, true);

    return {
      sent: delivery.sent || this.queue.has(eventId),
      reason: delivery.reason || '',
      queued: this.queue.has(eventId),
      delivered: delivery.sent,
      eventId,
    };
  }

  async flushDue() {
    if (!this.enabled) {
      return;
    }

    if (this.flushing) {
      return;
    }

    this.ensureInitialized();
    this.flushing = true;

    try {
      const now = Date.now();
      const due = Array.from(this.queue.values())
        .filter((record) => Number(record.next_attempt_at || 0) <= now)
        .sort((a, b) => Number(a.next_attempt_at || 0) - Number(b.next_attempt_at || 0));

      for (const record of due) {
        await this.deliverRecord(record, false);
      }
      this.lastFlushAtValue = new Date().toISOString();
    } finally {
      this.flushing = false;
    }
  }

  async deliverRecord(record, immediate) {
    const now = Date.now();
    if (!immediate && Number(record.next_attempt_at || 0) > now) {
      return { sent: false, reason: 'not_due' };
    }

    const result = await this.deliver(record.payload);
    if (result.sent) {
      this.queue.delete(record.event_id);
      this.persistQueue();
      return { sent: true, reason: '' };
    }

    record.attempts = Number(record.attempts || 0) + 1;
    record.updated_at = new Date(now).toISOString();
    record.last_error = result.reason || 'unknown_error';

    if (record.attempts >= this.retryMaxAttempts) {
      this.moveToDeadLetter(record);
      this.queue.delete(record.event_id);
      this.persistQueue();
      this.logger?.error?.(
        `outbox_dead_letter event_id=${record.event_id} posting_id=${record.payload?.postingId || ''} reason=${record.last_error}`,
      );
      return { sent: false, reason: record.last_error };
    }

    const backoffBase = this.retryBaseMs * 2 ** (record.attempts - 1);
    const capped = Math.min(backoffBase, 15 * 60 * 1000);
    record.next_attempt_at = now + jitteredDelay(capped);

    this.queue.set(record.event_id, record);
    this.persistQueue();
    return { sent: false, reason: record.last_error };
  }

  moveToDeadLetter(record) {
    const deadRecord = {
      ...record,
      dead_lettered_at: new Date().toISOString(),
    };

    fs.appendFileSync(this.deadPath, `${JSON.stringify(deadRecord)}\n`, 'utf8');
    this.deadLetterCountValue += 1;
    if (typeof this.onDeadLetter === 'function') {
      try {
        this.onDeadLetter(deadRecord);
      } catch (_error) {
        // Do not let callbacks interrupt outbox processing.
      }
    }
  }

  persistQueue() {
    const records = Array.from(this.queue.values());
    const body = records.map((record) => JSON.stringify(record)).join('\n');
    const tempPath = `${this.outboxPath}.tmp`;

    fs.writeFileSync(tempPath, body ? `${body}\n` : '', 'utf8');
    fs.renameSync(tempPath, this.outboxPath);
  }

  queueSize() {
    return this.queue.size;
  }

  deadLetterCount() {
    return this.deadLetterCountValue;
  }

  lastFlushAt() {
    return this.lastFlushAtValue;
  }
}

module.exports = {
  IngestOutbox,
  buildEventId,
};
