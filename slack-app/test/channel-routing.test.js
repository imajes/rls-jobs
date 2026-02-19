const test = require('node:test');
const assert = require('node:assert/strict');

const { recommendChannel, mapFocusToChannelId } = require('../src/channel-routing');
const {
  CANDIDATE_AVAILABILITY,
  CHANNEL_FOCUS,
  EMPLOYMENT_TYPE,
  POST_KIND,
  WORK_ARRANGEMENT,
} = require('../src/constants');

test('routes cofounder jobs to cofounder channel', () => {
  const recommendation = recommendChannel(POST_KIND.JOB, {
    employmentTypes: [EMPLOYMENT_TYPE.COFOUNDER],
    workArrangements: [WORK_ARRANGEMENT.REMOTE],
  });

  assert.equal(recommendation.key, CHANNEL_FOCUS.COFOUNDER);
  assert.equal(recommendation.reason, 'employment_type_cofounder');
});

test('routes remote-only jobs to remote channel', () => {
  const recommendation = recommendChannel(POST_KIND.JOB, {
    employmentTypes: [EMPLOYMENT_TYPE.FULL_TIME],
    workArrangements: [WORK_ARRANGEMENT.REMOTE],
  });

  assert.equal(recommendation.key, CHANNEL_FOCUS.REMOTE);
});

test('routes onsite-only jobs to onsite channel', () => {
  const recommendation = recommendChannel(POST_KIND.JOB, {
    employmentTypes: [EMPLOYMENT_TYPE.FULL_TIME],
    workArrangements: [WORK_ARRANGEMENT.ONSITE],
  });

  assert.equal(recommendation.key, CHANNEL_FOCUS.ONSITE);
});

test('uses text fallback for consulting-like terms', () => {
  const recommendation = recommendChannel(POST_KIND.JOB, {
    employmentTypes: [EMPLOYMENT_TYPE.FULL_TIME],
    workArrangements: [WORK_ARRANGEMENT.REMOTE, WORK_ARRANGEMENT.HYBRID],
    summary: 'Open to fractional consulting leadership too',
  });

  assert.equal(recommendation.key, CHANNEL_FOCUS.CONSULTING);
  assert.equal(recommendation.reason, 'keyword_or_mixed_fallback');
});

test('routes candidate cofounder mode to cofounder', () => {
  const recommendation = recommendChannel(POST_KIND.CANDIDATE, {
    availabilityModes: [CANDIDATE_AVAILABILITY.COFOUNDER_ONLY],
    workArrangements: [WORK_ARRANGEMENT.REMOTE],
  });

  assert.equal(recommendation.key, CHANNEL_FOCUS.COFOUNDER);
});

test('maps channel focus to configured channel id', () => {
  const channelId = mapFocusToChannelId(CHANNEL_FOCUS.REMOTE, {
    jobs: 'C1',
    onsiteJobs: 'C2',
    remoteJobs: 'C3',
    jobsCofounders: 'C4',
    jobsConsulting: 'C5',
  });

  assert.equal(channelId, 'C3');
  assert.equal(mapFocusToChannelId('unknown_focus', {}), '');
});
