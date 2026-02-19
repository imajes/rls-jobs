const test = require('node:test');
const assert = require('node:assert/strict');

const { createPostingsCache } = require('../src/postings-cache');

test('postings cache stores, reads, and expires entries by ttl', () => {
  const originalNow = Date.now;
  const cache = createPostingsCache({ ttlMs: 1000 });

  try {
    Date.now = () => 1000;
    cache.set('U1', [{ id: 'posting-1' }]);

    let cached = cache.get('U1');
    assert.equal(cached.stale, false);
    assert.equal(cached.postings.length, 1);

    Date.now = () => 2201;
    cached = cache.get('U1');
    assert.equal(cached.stale, true);

    cache.evict('U1');
    assert.equal(cache.get('U1'), null);
  } finally {
    Date.now = originalNow;
  }
});
