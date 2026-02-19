const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('./helpers');

test('preview store tracks route updates and dedupes published routes', () => {
  const previewStore = loadFresh('../src/preview-store');
  const previewId = previewStore.createPreview('job_posting', { roleTitle: 'Engineer' }, { key: 'jobs' }, 'C123');

  previewStore.updatePreviewRoute(previewId, 'remote_jobs', 'C456');
  previewStore.markPreviewPublished(previewId, 'C456', '1.000');
  previewStore.markPreviewPublished(previewId, 'C456', '1.001');

  const preview = previewStore.getPreview(previewId);
  assert.equal(preview.channelFocus, 'remote_jobs');
  assert.equal(preview.routedChannelId, 'C456');
  assert.equal(preview.publishedRoutes.length, 1);
  assert.equal(previewStore.isPublishedToRoute(previewId, 'C456'), true);
  assert.equal(previewStore.isPublishedToRoute(previewId, 'C999'), false);
});

test('preview store expires stale previews on read', () => {
  const previewStore = loadFresh('../src/preview-store');

  const originalNow = Date.now;
  try {
    Date.now = () => 1_000;
    const previewId = previewStore.createPreview('job_posting', {}, { key: 'jobs' }, 'C1');

    Date.now = () => 1_000 + 2 * 60 * 60 * 1000 + 1;
    assert.equal(previewStore.getPreview(previewId), null);
  } finally {
    Date.now = originalNow;
  }
});

test('posting store supports create/update/archive/list and message lookup', () => {
  const postingStore = loadFresh('../src/posting-store');

  const a = postingStore.createPosting({
    id: 'posting-a',
    kind: 'job_posting',
    values: { roleTitle: 'A' },
    posterUserId: 'U1',
    channelId: 'C1',
    channelFocus: 'jobs',
    messageTs: '100.1',
  });
  const b = postingStore.createPosting({
    id: 'posting-b',
    kind: 'candidate_profile',
    values: { headline: 'B' },
    posterUserId: 'U1',
    channelId: 'C2',
    channelFocus: 'remote_jobs',
    messageTs: '200.2',
  });

  postingStore.updatePosting('posting-a', { permalink: 'https://slack.test/a' });
  postingStore.archivePosting('posting-b', 'U1');

  assert.equal(postingStore.getPosting('posting-a').permalink, 'https://slack.test/a');
  assert.equal(postingStore.findPostingByMessage('C2', '200.2').id, 'posting-b');

  const list = postingStore.listPostingsByUser('U1');
  assert.equal(list.length, 2);
  assert.equal(
    list.some((posting) => posting.status === 'archived'),
    true,
  );
  assert.equal(a.posterUserId, 'U1');
  assert.equal(b.posterUserId, 'U1');
});
