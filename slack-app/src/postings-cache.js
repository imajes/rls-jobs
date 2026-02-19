function createPostingsCache({ ttlMs = 60000 } = {}) {
  const entries = new Map();

  function get(userId) {
    if (!userId) {
      return null;
    }

    const entry = entries.get(userId);
    if (!entry) {
      return null;
    }

    const stale = Date.now() - entry.cachedAt > ttlMs;
    return {
      postings: entry.postings,
      stale,
      source: stale ? 'stale_cache' : 'cache',
    };
  }

  function set(userId, postings) {
    if (!userId) {
      return;
    }

    entries.set(userId, {
      postings: Array.isArray(postings) ? postings : [],
      cachedAt: Date.now(),
    });
  }

  function evict(userId) {
    if (!userId) {
      return;
    }
    entries.delete(userId);
  }

  return {
    get,
    set,
    evict,
  };
}

module.exports = {
  createPostingsCache,
};
