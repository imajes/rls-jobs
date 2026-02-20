const test = require('node:test');
const assert = require('node:assert/strict');

const { candidatePreviewMessage, jobPreviewMessage } = require('../src/preview-messages');

test('job preview can hide route override control', () => {
  const message = jobPreviewMessage(
    'U1',
    {
      roleTitle: 'Engineer',
      companyName: 'Hooli',
      locationSummary: 'NYC',
      summary: 'A role',
      employmentTypes: ['full_time'],
      compensationValue: '$180k-$220k',
      visaPolicy: 'unknown',
    },
    { key: 'jobs' },
    'CJOBS',
    'preview-1',
    { allowRouteOverride: false, routeLockedMessage: 'locked' },
  );

  const actionsBlock = message.blocks.find((block) => block.type === 'actions');
  assert(actionsBlock);
  assert.equal(
    actionsBlock.elements.some((element) => element.type === 'overflow'),
    false,
  );
  assert(message.blocks.some((block) => JSON.stringify(block).includes('locked')));
});

test('candidate preview includes route override control when enabled', () => {
  const message = candidatePreviewMessage(
    'U1',
    {
      headline: 'Senior Product Engineer',
      locationSummary: 'Remote',
      notes: 'Open to full-time roles',
      workArrangements: ['remote'],
      availabilityModes: ['full_time'],
      compensationValue: '$200k',
    },
    { key: 'remote_jobs' },
    'CREMOTE',
    'preview-2',
    { allowRouteOverride: true },
  );

  const actionsBlock = message.blocks.find((block) => block.type === 'actions');
  assert(actionsBlock);
  assert.equal(
    actionsBlock.elements.some((element) => element.type === 'overflow'),
    true,
  );
});
