const { randomUUID } = require('node:crypto');

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;
const previews = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [id, preview] of previews.entries()) {
    if (preview.expiresAt <= now) {
      previews.delete(id);
    }
  }
}

function createPreview(kind, values, recommendation, routedChannelId = '') {
  pruneExpired();
  const id = randomUUID();
  const now = Date.now();
  previews.set(id, {
    id,
    kind,
    values,
    recommendation,
    routedChannelId,
    createdAt: now,
    expiresAt: now + PREVIEW_TTL_MS,
  });
  return id;
}

function getPreview(id) {
  const preview = previews.get(id);
  if (!preview) {
    return null;
  }

  if (preview.expiresAt <= Date.now()) {
    previews.delete(id);
    return null;
  }

  return preview;
}

module.exports = {
  createPreview,
  getPreview,
};
