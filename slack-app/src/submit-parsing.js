const { FIELD_IDS } = require('./field-ids');
const { getCheckboxValues, getInputValue, getStaticSelectValue } = require('./view-state');

function parseJobSubmission(viewStateValues) {
  const ids = FIELD_IDS.job;
  const stealthFlags = getCheckboxValues(viewStateValues, ids.stealthCompany[0], ids.stealthCompany[1]);
  const threadFlags = getCheckboxValues(viewStateValues, ids.allowThreadQuestions[0], ids.allowThreadQuestions[1]);

  return {
    companyName: getInputValue(viewStateValues, ids.companyName[0], ids.companyName[1]),
    stealthCompany: stealthFlags.includes('stealth_enabled'),
    roleTitle: getInputValue(viewStateValues, ids.roleTitle[0], ids.roleTitle[1]),
    employmentType: getStaticSelectValue(viewStateValues, ids.employmentType[0], ids.employmentType[1]),
    locationSummary: getInputValue(viewStateValues, ids.locationSummary[0], ids.locationSummary[1]),
    workArrangement: getStaticSelectValue(viewStateValues, ids.workArrangement[0], ids.workArrangement[1]),
    compensationDisclosure: getStaticSelectValue(
      viewStateValues,
      ids.compensationDisclosure[0],
      ids.compensationDisclosure[1],
    ),
    compensationRange: getInputValue(viewStateValues, ids.compensationRange[0], ids.compensationRange[1]),
    visaPolicy: getStaticSelectValue(viewStateValues, ids.visaPolicy[0], ids.visaPolicy[1]),
    relationship: getStaticSelectValue(viewStateValues, ids.relationship[0], ids.relationship[1]),
    channelFocus: getStaticSelectValue(viewStateValues, ids.channelFocus[0], ids.channelFocus[1]),
    jobUrl: getInputValue(viewStateValues, ids.jobUrl[0], ids.jobUrl[1]),
    skills: getInputValue(viewStateValues, ids.skills[0], ids.skills[1]),
    description: getInputValue(viewStateValues, ids.description[0], ids.description[1]),
    allowThreadQuestions: threadFlags.includes('allow_thread_questions'),
  };
}

function parseCandidateSubmission(viewStateValues) {
  const ids = FIELD_IDS.candidate;
  const threadFlags = getCheckboxValues(viewStateValues, ids.allowThreadQuestions[0], ids.allowThreadQuestions[1]);

  return {
    headline: getInputValue(viewStateValues, ids.headline[0], ids.headline[1]),
    locationSummary: getInputValue(viewStateValues, ids.locationSummary[0], ids.locationSummary[1]),
    workArrangement: getStaticSelectValue(viewStateValues, ids.workArrangement[0], ids.workArrangement[1]),
    compensationDisclosure: getStaticSelectValue(
      viewStateValues,
      ids.compensationDisclosure[0],
      ids.compensationDisclosure[1],
    ),
    compensationTarget: getInputValue(viewStateValues, ids.compensationTarget[0], ids.compensationTarget[1]),
    visaPolicy: getStaticSelectValue(viewStateValues, ids.visaPolicy[0], ids.visaPolicy[1]),
    relationship: getStaticSelectValue(viewStateValues, ids.relationship[0], ids.relationship[1]),
    availabilityStatus: getStaticSelectValue(viewStateValues, ids.availabilityStatus[0], ids.availabilityStatus[1]),
    channelFocus: getStaticSelectValue(viewStateValues, ids.channelFocus[0], ids.channelFocus[1]),
    links: getInputValue(viewStateValues, ids.links[0], ids.links[1]),
    skills: getInputValue(viewStateValues, ids.skills[0], ids.skills[1]),
    notes: getInputValue(viewStateValues, ids.notes[0], ids.notes[1]),
    allowThreadQuestions: threadFlags.includes('allow_thread_questions'),
  };
}

module.exports = {
  parseCandidateSubmission,
  parseJobSubmission,
};
