const {
  CANDIDATE_AVAILABILITY_OPTIONS,
  COMP_COMPONENT_OPTIONS,
  COMP_DISCLOSURE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS_CANDIDATE,
  RELATIONSHIP_OPTIONS_JOB,
  VISA_POLICY_OPTIONS_CANDIDATE,
  VISA_POLICY_OPTIONS_JOB,
  WORK_ARRANGEMENT_OPTIONS,
} = require('./constants');
const { FIELD_IDS } = require('./field-ids');

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function optionFrom(item) {
  return {
    text: plainText(item.text),
    value: item.value,
  };
}

function checkboxElement(actionId, options, selectedValues = []) {
  const mappedOptions = options.map(optionFrom);
  const initialOptions = options.filter((item) => selectedValues.includes(item.value)).map(optionFrom);

  const element = {
    type: 'checkboxes',
    action_id: actionId,
    options: mappedOptions,
  };

  if (initialOptions.length) {
    element.initial_options = initialOptions;
  }

  return element;
}

function radioElement(actionId, options, selectedValue) {
  const mappedOptions = options.map(optionFrom);
  const initialOption = options.find((item) => item.value === selectedValue);

  const element = {
    type: 'radio_buttons',
    action_id: actionId,
    options: mappedOptions,
  };

  if (initialOption) {
    element.initial_option = optionFrom(initialOption);
  }

  return element;
}

function textInput(actionId, placeholder, value = '', multiline = false) {
  return {
    type: 'plain_text_input',
    action_id: actionId,
    initial_value: value || '',
    multiline,
    placeholder: plainText(placeholder),
  };
}

function inputBlock(blockId, label, element, optional = false) {
  return {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element,
    optional,
  };
}

function privateMetadata(postingId) {
  return JSON.stringify({ postingId });
}

function buildJobEditModal(posting) {
  const values = posting.values || {};
  const ids = FIELD_IDS.job;

  return {
    type: 'modal',
    callback_id: 'job_posting_edit_modal',
    private_metadata: privateMetadata(posting.id),
    title: plainText('Edit Job Posting'),
    submit: plainText('Save Changes'),
    close: plainText('Cancel'),
    blocks: [
      inputBlock(ids.companyName[0], 'Company', textInput(ids.companyName[1], 'Company name', values.companyName)),
      inputBlock(ids.roleTitle[0], 'Role', textInput(ids.roleTitle[1], 'Role title', values.roleTitle)),
      inputBlock(
        ids.locationSummary[0],
        'Location',
        textInput(ids.locationSummary[1], 'Where can someone do this role?', values.locationSummary),
      ),
      inputBlock(
        ids.workArrangements[0],
        'Work setup',
        checkboxElement(ids.workArrangements[1], WORK_ARRANGEMENT_OPTIONS, values.workArrangements || []),
      ),
      inputBlock(
        ids.employmentTypes[0],
        'Employment',
        checkboxElement(ids.employmentTypes[1], EMPLOYMENT_TYPE_OPTIONS, values.employmentTypes || []),
      ),
      inputBlock(
        ids.compensationValue[0],
        'Compensation',
        textInput(ids.compensationValue[1], 'Examples: $180k-$220k USD or negotiable', values.compensationValue),
      ),
      inputBlock(
        ids.compensationComponents[0],
        'Comp components',
        checkboxElement(ids.compensationComponents[1], COMP_COMPONENT_OPTIONS, values.compensationComponents || []),
        true,
      ),
      inputBlock(
        ids.visaPolicy[0],
        'Visa',
        radioElement(ids.visaPolicy[1], VISA_POLICY_OPTIONS_JOB, values.visaPolicy),
      ),
      inputBlock(
        ids.relationship[0],
        'Relationship to role',
        radioElement(ids.relationship[1], RELATIONSHIP_OPTIONS_JOB, values.relationship),
      ),
      inputBlock(ids.links[0], 'Links', textInput(ids.links[1], 'Add one URL per line', values.links, true), true),
      inputBlock(ids.skills[0], 'Skills', textInput(ids.skills[1], 'Comma-separated skills', values.skills), true),
      inputBlock(
        ids.summary[0],
        'Summary',
        textInput(ids.summary[1], 'Short role summary', values.summary, true),
        true,
      ),
      inputBlock(
        ids.allowThreadQuestions[0],
        'Thread follow-ups',
        checkboxElement(
          ids.allowThreadQuestions[1],
          [{ text: 'Allow follow-up questions in thread', value: 'allow_thread_questions' }],
          values.allowThreadQuestions ? ['allow_thread_questions'] : [],
        ),
        true,
      ),
    ],
  };
}

function buildCandidateEditModal(posting) {
  const values = posting.values || {};
  const ids = FIELD_IDS.candidate;

  return {
    type: 'modal',
    callback_id: 'candidate_posting_edit_modal',
    private_metadata: privateMetadata(posting.id),
    title: plainText('Edit Candidate Posting'),
    submit: plainText('Save Changes'),
    close: plainText('Cancel'),
    blocks: [
      inputBlock(ids.headline[0], 'Headline', textInput(ids.headline[1], 'Target role(s)', values.headline)),
      inputBlock(
        ids.locationSummary[0],
        'Location',
        textInput(ids.locationSummary[1], 'Preferred work location', values.locationSummary),
      ),
      inputBlock(
        ids.workArrangements[0],
        'Work setup',
        checkboxElement(ids.workArrangements[1], WORK_ARRANGEMENT_OPTIONS, values.workArrangements || []),
      ),
      inputBlock(
        ids.availabilityModes[0],
        'Availability',
        checkboxElement(ids.availabilityModes[1], CANDIDATE_AVAILABILITY_OPTIONS, values.availabilityModes || []),
      ),
      inputBlock(
        ids.engagementTypes[0],
        'Engagement',
        checkboxElement(ids.engagementTypes[1], EMPLOYMENT_TYPE_OPTIONS, values.engagementTypes || []),
      ),
      inputBlock(
        ids.compensationDisclosure[0],
        'Comp details',
        radioElement(ids.compensationDisclosure[1], COMP_DISCLOSURE_OPTIONS, values.compensationDisclosure),
      ),
      inputBlock(
        ids.compensationValue[0],
        'Compensation',
        textInput(ids.compensationValue[1], 'Examples: $200k base or negotiable', values.compensationValue),
      ),
      inputBlock(
        ids.compensationComponents[0],
        'Comp components',
        checkboxElement(ids.compensationComponents[1], COMP_COMPONENT_OPTIONS, values.compensationComponents || []),
        true,
      ),
      inputBlock(
        ids.visaPolicy[0],
        'Work authorization',
        radioElement(ids.visaPolicy[1], VISA_POLICY_OPTIONS_CANDIDATE, values.visaPolicy),
      ),
      inputBlock(
        ids.relationship[0],
        'Relationship',
        radioElement(ids.relationship[1], RELATIONSHIP_OPTIONS_CANDIDATE, values.relationship),
      ),
      inputBlock(ids.links[0], 'Links', textInput(ids.links[1], 'Add one URL per line', values.links, true), true),
      inputBlock(ids.skills[0], 'Skills', textInput(ids.skills[1], 'Comma-separated skills', values.skills), true),
      inputBlock(ids.notes[0], 'Notes', textInput(ids.notes[1], 'Optional context', values.notes, true), true),
      inputBlock(
        ids.allowThreadQuestions[0],
        'Thread follow-ups',
        checkboxElement(
          ids.allowThreadQuestions[1],
          [{ text: 'Allow follow-up questions in thread', value: 'allow_thread_questions' }],
          values.allowThreadQuestions ? ['allow_thread_questions'] : [],
        ),
        true,
      ),
    ],
  };
}

module.exports = {
  buildCandidateEditModal,
  buildJobEditModal,
};
