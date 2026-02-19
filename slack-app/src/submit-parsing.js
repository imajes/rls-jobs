const { FIELD_IDS } = require('./field-ids');
const { getCheckboxValues, getInputValue, getRadioValue } = require('./view-state');

function parseJobStep1(viewStateValues) {
  const ids = FIELD_IDS.job;

  return {
    companyName: getInputValue(viewStateValues, ids.companyName[0], ids.companyName[1]),
    roleTitle: getInputValue(viewStateValues, ids.roleTitle[0], ids.roleTitle[1]),
    locationSummary: getInputValue(viewStateValues, ids.locationSummary[0], ids.locationSummary[1]),
    workArrangements: getCheckboxValues(viewStateValues, ids.workArrangements[0], ids.workArrangements[1]),
  };
}

function parseJobStep2(viewStateValues) {
  const ids = FIELD_IDS.job;

  return {
    employmentTypes: getCheckboxValues(viewStateValues, ids.employmentTypes[0], ids.employmentTypes[1]),
    compensationValue: getInputValue(viewStateValues, ids.compensationValue[0], ids.compensationValue[1]),
    compensationComponents: getCheckboxValues(
      viewStateValues,
      ids.compensationComponents[0],
      ids.compensationComponents[1],
    ),
  };
}

function parseJobStep3(viewStateValues) {
  const ids = FIELD_IDS.job;
  const threadFlags = getCheckboxValues(viewStateValues, ids.allowThreadQuestions[0], ids.allowThreadQuestions[1]);

  return {
    visaPolicy: getRadioValue(viewStateValues, ids.visaPolicy[0], ids.visaPolicy[1]),
    relationship: getRadioValue(viewStateValues, ids.relationship[0], ids.relationship[1]),
    links: getInputValue(viewStateValues, ids.links[0], ids.links[1]),
    skills: getInputValue(viewStateValues, ids.skills[0], ids.skills[1]),
    summary: getInputValue(viewStateValues, ids.summary[0], ids.summary[1]),
    allowThreadQuestions: threadFlags.includes('allow_thread_questions'),
  };
}

function parseCandidateStep1(viewStateValues) {
  const ids = FIELD_IDS.candidate;

  return {
    headline: getInputValue(viewStateValues, ids.headline[0], ids.headline[1]),
    locationSummary: getInputValue(viewStateValues, ids.locationSummary[0], ids.locationSummary[1]),
    workArrangements: getCheckboxValues(viewStateValues, ids.workArrangements[0], ids.workArrangements[1]),
    availabilityModes: getCheckboxValues(viewStateValues, ids.availabilityModes[0], ids.availabilityModes[1]),
  };
}

function parseCandidateStep2(viewStateValues) {
  const ids = FIELD_IDS.candidate;

  return {
    engagementTypes: getCheckboxValues(viewStateValues, ids.engagementTypes[0], ids.engagementTypes[1]),
    compensationDisclosure: getRadioValue(
      viewStateValues,
      ids.compensationDisclosure[0],
      ids.compensationDisclosure[1],
    ),
    compensationValue: getInputValue(viewStateValues, ids.compensationValue[0], ids.compensationValue[1]),
    compensationComponents: getCheckboxValues(
      viewStateValues,
      ids.compensationComponents[0],
      ids.compensationComponents[1],
    ),
  };
}

function parseCandidateStep3(viewStateValues) {
  const ids = FIELD_IDS.candidate;
  const threadFlags = getCheckboxValues(viewStateValues, ids.allowThreadQuestions[0], ids.allowThreadQuestions[1]);

  return {
    visaPolicy: getRadioValue(viewStateValues, ids.visaPolicy[0], ids.visaPolicy[1]),
    relationship: getRadioValue(viewStateValues, ids.relationship[0], ids.relationship[1]),
    links: getInputValue(viewStateValues, ids.links[0], ids.links[1]),
    skills: getInputValue(viewStateValues, ids.skills[0], ids.skills[1]),
    notes: getInputValue(viewStateValues, ids.notes[0], ids.notes[1]),
    allowThreadQuestions: threadFlags.includes('allow_thread_questions'),
  };
}

module.exports = {
  parseCandidateStep1,
  parseCandidateStep2,
  parseCandidateStep3,
  parseJobStep1,
  parseJobStep2,
  parseJobStep3,
};
