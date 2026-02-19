const test = require('node:test');
const assert = require('node:assert/strict');

const {
  splitLinks,
  validateCandidateStep1,
  validateCandidateStep2,
  validateCandidateStep3,
  validateJobStep1,
  validateJobStep2,
  validateJobStep3,
} = require('../src/validation');

test('splitLinks handles newline/comma separation and trimming', () => {
  const links = splitLinks(' https://a.test,\nhttp://b.test\n , https://c.test ');
  assert.deepEqual(links, ['https://a.test', 'http://b.test', 'https://c.test']);
});

test('validateJobStep1 requires key fields', () => {
  const errors = validateJobStep1({
    companyName: '',
    roleTitle: '',
    locationSummary: '',
    workArrangements: [],
  });

  assert.equal(Object.keys(errors).length, 4);
});

test('validateJobStep2 requires employment and compensation', () => {
  const errors = validateJobStep2({ employmentTypes: [], compensationValue: '' });
  assert.equal(Object.keys(errors).length, 2);
});

test('validateJobStep3 rejects non-http links', () => {
  const errors = validateJobStep3({
    visaPolicy: 'yes',
    relationship: 'hiring_manager',
    links: 'ftp://invalid.example',
  });

  const values = Object.values(errors).join(' ');
  assert.match(values, /Links must start with http/i);
});

test('candidate validators enforce required fields', () => {
  const step1Errors = validateCandidateStep1({
    headline: '',
    locationSummary: '',
    workArrangements: [],
    availabilityModes: [],
  });
  assert.equal(Object.keys(step1Errors).length, 4);

  const step2Errors = validateCandidateStep2({
    engagementTypes: [],
    compensationDisclosure: '',
    compensationValue: '',
  });
  assert.equal(Object.keys(step2Errors).length, 3);

  const step3Errors = validateCandidateStep3({
    visaPolicy: '',
    relationship: '',
    links: 'invalid-link',
  });
  assert.equal(Object.keys(step3Errors).length, 3);
});
