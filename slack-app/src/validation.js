const { FIELD_IDS } = require('./field-ids');

function splitLinks(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value);
}

function validateLinkField(value, blockId, errors) {
  const invalid = splitLinks(value).find((link) => !looksLikeUrl(link));
  if (invalid) {
    errors[blockId] = 'Links must start with http:// or https://';
  }
}

function validateJobStep1(values) {
  const ids = FIELD_IDS.job;
  const errors = {};

  if (!values.companyName) {
    errors[ids.companyName[0]] = 'Company is required.';
  }

  if (!values.roleTitle) {
    errors[ids.roleTitle[0]] = 'Role is required.';
  }

  if (!values.locationSummary) {
    errors[ids.locationSummary[0]] = 'Location is required.';
  }

  if (!values.workArrangements.length) {
    errors[ids.workArrangements[0]] = 'Select at least one work arrangement.';
  }

  return errors;
}

function validateJobStep2(values) {
  const ids = FIELD_IDS.job;
  const errors = {};

  if (!values.employmentTypes.length) {
    errors[ids.employmentTypes[0]] = 'Select at least one employment type.';
  }

  if (!values.compensationValue) {
    errors[ids.compensationValue[0]] = 'Compensation value or range is required.';
  }

  return errors;
}

function validateJobStep3(values) {
  const ids = FIELD_IDS.job;
  const errors = {};

  if (!values.visaPolicy) {
    errors[ids.visaPolicy[0]] = 'Select visa sponsorship status.';
  }

  if (!values.relationship) {
    errors[ids.relationship[0]] = 'Select your relationship to this role.';
  }

  validateLinkField(values.links, ids.links[0], errors);
  return errors;
}

function validateCandidateStep1(values) {
  const ids = FIELD_IDS.candidate;
  const errors = {};

  if (!values.headline) {
    errors[ids.headline[0]] = 'Target role(s) are required.';
  }

  if (!values.locationSummary) {
    errors[ids.locationSummary[0]] = 'Location is required.';
  }

  if (!values.workArrangements.length) {
    errors[ids.workArrangements[0]] = 'Select at least one work arrangement.';
  }

  if (!values.availabilityModes.length) {
    errors[ids.availabilityModes[0]] = 'Select at least one availability mode.';
  }

  return errors;
}

function validateCandidateStep2(values) {
  const ids = FIELD_IDS.candidate;
  const errors = {};

  if (!values.engagementTypes.length) {
    errors[ids.engagementTypes[0]] = 'Select at least one engagement type.';
  }

  if (!values.compensationDisclosure) {
    errors[ids.compensationDisclosure[0]] = 'Select compensation visibility.';
  }

  if (!values.compensationValue) {
    errors[ids.compensationValue[0]] = 'Compensation value or range is required.';
  }

  return errors;
}

function validateCandidateStep3(values) {
  const ids = FIELD_IDS.candidate;
  const errors = {};

  if (!values.visaPolicy) {
    errors[ids.visaPolicy[0]] = 'Select work authorization or visa status.';
  }

  if (!values.relationship) {
    errors[ids.relationship[0]] = 'Select relationship.';
  }

  validateLinkField(values.links, ids.links[0], errors);
  return errors;
}

module.exports = {
  splitLinks,
  validateCandidateStep1,
  validateCandidateStep2,
  validateCandidateStep3,
  validateJobStep1,
  validateJobStep2,
  validateJobStep3,
};
