const { randomUUID } = require('node:crypto');

const postings = new Map();

function createPosting({
  id = randomUUID(),
  kind,
  values,
  posterUserId,
  channelId,
  channelFocus,
  messageTs = '',
  permalink = '',
}) {
  const now = Date.now();
  const posting = {
    id,
    kind,
    values,
    posterUserId,
    channelId,
    channelFocus,
    messageTs,
    permalink,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    archivedByUserId: null,
  };
  postings.set(id, posting);
  return posting;
}

function getPosting(id) {
  return postings.get(id) || null;
}

function findPostingByMessage(channelId, messageTs) {
  if (!channelId || !messageTs) {
    return null;
  }

  for (const posting of postings.values()) {
    if (posting.channelId === channelId && posting.messageTs === messageTs) {
      return posting;
    }
  }
  return null;
}

function updatePosting(id, patch) {
  const posting = getPosting(id);
  if (!posting) {
    return null;
  }

  Object.assign(posting, patch, { updatedAt: Date.now() });
  return posting;
}

function archivePosting(id, archivedByUserId) {
  const posting = getPosting(id);
  if (!posting) {
    return null;
  }

  posting.status = 'archived';
  posting.archivedAt = Date.now();
  posting.archivedByUserId = archivedByUserId;
  posting.updatedAt = Date.now();
  return posting;
}

function listPostingsByUser(userId, { limit = 50 } = {}) {
  return Array.from(postings.values())
    .filter((posting) => posting.posterUserId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

module.exports = {
  archivePosting,
  createPosting,
  findPostingByMessage,
  getPosting,
  listPostingsByUser,
  updatePosting,
};
