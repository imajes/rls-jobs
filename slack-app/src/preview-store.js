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
    channelFocus: recommendation?.key || '',
    routedChannelId,
    publishedRoutes: [],
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

function updatePreviewRoute(id, channelFocus, routedChannelId = '') {
  const preview = getPreview(id);
  if (!preview) {
    return null;
  }

  preview.channelFocus = channelFocus || preview.channelFocus;
  preview.routedChannelId = routedChannelId;
  return preview;
}

function markPreviewPublished(id, channelId, messageTs = '') {
  const preview = getPreview(id);
  if (!preview) {
    return null;
  }

  const existing = preview.publishedRoutes.find((route) => route.channelId === channelId);
  if (existing) {
    return preview;
  }

  preview.publishedRoutes.push({
    channelId,
    messageTs,
    publishedAt: Date.now(),
  });
  return preview;
}

function isPublishedToRoute(id, channelId) {
  const preview = getPreview(id);
  if (!preview) {
    return false;
  }

  return preview.publishedRoutes.some((route) => route.channelId === channelId);
}

module.exports = {
  createPreview,
  getPreview,
  isPublishedToRoute,
  markPreviewPublished,
  updatePreviewRoute,
};
