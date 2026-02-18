const { COMP_DISCLOSURE } = require('./constants');
const { FIELD_IDS } = require('./field-ids');

function looksLikeUrl(value) {
  if (!value) {
    return true;
  }

  return /^https?:\/\//i.test(value);
}

function validateJobSubmission(values) {
  const ids = FIELD_IDS.job;
  const errors = {};

  if (!values.stealthCompany && !values.companyName) {
    errors[ids.companyName[0]] = 'Company name is required unless stealth mode is enabled.';
  }

  if (!values.roleTitle) {
    errors[ids.roleTitle[0]] = 'Role title is required.';
  }

  if (!values.employmentType) {
    errors[ids.employmentType[0]] = 'Select an employment type.';
  }

  if (!values.locationSummary) {
    errors[ids.locationSummary[0]] = 'Location details are required.';
  }

  if (!values.workArrangement) {
    errors[ids.workArrangement[0]] = 'Select a work arrangement.';
  }

  if (!values.compensationDisclosure) {
    errors[ids.compensationDisclosure[0]] = 'Select compensation disclosure status.';
  }

  if (values.compensationDisclosure === COMP_DISCLOSURE.RANGE && !values.compensationRange) {
    errors[ids.compensationRange[0]] = 'Range details are required when range disclosure is selected.';
  }

  if (!values.visaPolicy) {
    errors[ids.visaPolicy[0]] = 'Select visa sponsorship status.';
  }

  if (!values.relationship) {
    errors[ids.relationship[0]] = 'Select your relationship to this role.';
  }

  if (!values.channelFocus) {
    errors[ids.channelFocus[0]] = 'Select auto-pick or a channel override.';
  }

  if (!looksLikeUrl(values.jobUrl)) {
    errors[ids.jobUrl[0]] = 'Job link must start with http:// or https://';
  }

  return errors;
}

function validateCandidateSubmission(values) {
  const ids = FIELD_IDS.candidate;
  const errors = {};

  if (!values.headline) {
    errors[ids.headline[0]] = 'Target role(s) are required.';
  }

  if (!values.locationSummary) {
    errors[ids.locationSummary[0]] = 'Location details are required.';
  }

  if (!values.workArrangement) {
    errors[ids.workArrangement[0]] = 'Select a work arrangement.';
  }

  if (!values.availabilityStatus) {
    errors[ids.availabilityStatus[0]] = 'Select current availability status.';
  }

  if (!values.compensationDisclosure) {
    errors[ids.compensationDisclosure[0]] = 'Select compensation disclosure status.';
  }

  if (values.compensationDisclosure === COMP_DISCLOSURE.RANGE && !values.compensationTarget) {
    errors[ids.compensationTarget[0]] = 'Enter compensation details when range disclosure is selected.';
  }

  if (!values.visaPolicy) {
    errors[ids.visaPolicy[0]] = 'Select work authorization / visa context.';
  }

  if (!values.relationship) {
    errors[ids.relationship[0]] = 'Select poster relationship.';
  }

  if (!values.channelFocus) {
    errors[ids.channelFocus[0]] = 'Select auto-pick or a channel override.';
  }

  if (values.links) {
    const invalidLink = values.links
      .split(',')
      .map((value) => value.trim())
      .find((value) => value && !looksLikeUrl(value));

    if (invalidLink) {
      errors[ids.links[0]] = 'Links must be comma-separated and start with http:// or https://';
    }
  }

  return errors;
}

module.exports = {
  validateCandidateSubmission,
  validateJobSubmission,
};
