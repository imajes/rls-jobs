const {
  CANDIDATE_AVAILABILITY_OPTIONS,
  CHANNEL_FOCUS,
  CHANNEL_FOCUS_OPTIONS,
  COMP_DISCLOSURE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS_CANDIDATE,
  RELATIONSHIP_OPTIONS_JOB,
  VISA_POLICY_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
} = require('./constants');
const { FIELD_IDS } = require('./field-ids');
const { plainTextInputElement, staticSelectElement } = require('./block-kit');

function modalTitle(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function submitLabel(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function hintMarkdown(text) {
  return {
    type: 'mrkdwn',
    text,
  };
}

function inputBlock(blockId, label, element, optional = false, hint = null) {
  const block = {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element,
    optional,
  };

  if (hint) {
    block.hint = hintMarkdown(hint);
  }

  return block;
}

function buildJobModal() {
  const ids = FIELD_IDS.job;

  return {
    type: 'modal',
    callback_id: 'job_posting_submit',
    private_metadata: JSON.stringify({ post_kind: 'job_posting' }),
    title: modalTitle('Post Job'),
    submit: submitLabel('Create Preview'),
    close: submitLabel('Cancel'),
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Structured job post*\nRequired fields mirror the recurring Slack reminder and improve discoverability.',
        },
      },
      inputBlock(
        ids.companyName[0],
        'Company name',
        plainTextInputElement(ids.companyName[1], 'Example: Calendly'),
        false,
        'If confidential, check *Stealth company* below and leave this blank.',
      ),
      {
        type: 'input',
        block_id: ids.stealthCompany[0],
        optional: true,
        label: plainText('Company visibility'),
        element: {
          type: 'checkboxes',
          action_id: ids.stealthCompany[1],
          options: [
            {
              text: plainText('Stealth company'),
              value: 'stealth_enabled',
            },
          ],
        },
      },
      inputBlock(
        ids.roleTitle[0],
        'Role title',
        plainTextInputElement(ids.roleTitle[1], 'Example: Principal Engineer'),
      ),
      inputBlock(
        ids.employmentType[0],
        'Employment type',
        staticSelectElement(ids.employmentType[1], 'Select a role type', EMPLOYMENT_TYPE_OPTIONS),
      ),
      inputBlock(
        ids.locationSummary[0],
        'Location',
        plainTextInputElement(ids.locationSummary[1], 'Office city/cities or remote constraints'),
      ),
      inputBlock(
        ids.workArrangement[0],
        'Work arrangement',
        staticSelectElement(ids.workArrangement[1], 'Select work style', WORK_ARRANGEMENT_OPTIONS),
      ),
      inputBlock(
        ids.compensationDisclosure[0],
        'Compensation disclosure',
        staticSelectElement(ids.compensationDisclosure[1], 'Select compensation status', COMP_DISCLOSURE_OPTIONS),
      ),
      inputBlock(
        ids.compensationRange[0],
        'Compensation details',
        plainTextInputElement(ids.compensationRange[1], 'Example: $170k-$220k USD base + equity'),
        true,
        'Optional unless compensation disclosure says range is provided.',
      ),
      inputBlock(
        ids.visaPolicy[0],
        'Visa sponsorship',
        staticSelectElement(ids.visaPolicy[1], 'Select visa policy', VISA_POLICY_OPTIONS),
      ),
      inputBlock(
        ids.relationship[0],
        'Your relationship to role',
        staticSelectElement(ids.relationship[1], 'Select relationship', RELATIONSHIP_OPTIONS_JOB),
      ),
      inputBlock(
        ids.channelFocus[0],
        'Channel focus',
        staticSelectElement(ids.channelFocus[1], 'Auto-pick or override', CHANNEL_FOCUS_OPTIONS, CHANNEL_FOCUS.AUTO),
        false,
        'Auto-pick routes to one of #jobs, #onsite-jobs, #remote-jobs, #jobs-cofounders, #jobs-consulting.',
      ),
      inputBlock(ids.jobUrl[0], 'Job link', plainTextInputElement(ids.jobUrl[1], 'https://...'), true),
      inputBlock(
        ids.skills[0],
        'Skills / stack',
        plainTextInputElement(ids.skills[1], 'Comma-separated: Ruby, Go, AWS, ...'),
        true,
      ),
      inputBlock(
        ids.description[0],
        'Role summary',
        plainTextInputElement(ids.description[1], 'Two to five concise lines', { multiline: true }),
        true,
      ),
      {
        type: 'input',
        block_id: ids.allowThreadQuestions[0],
        optional: true,
        label: plainText('Thread behavior'),
        element: {
          type: 'checkboxes',
          action_id: ids.allowThreadQuestions[1],
          options: [
            {
              text: plainText('I am open to thread questions on this post'),
              value: 'allow_thread_questions',
            },
          ],
        },
      },
    ],
  };
}

function buildCandidateModal() {
  const ids = FIELD_IDS.candidate;

  return {
    type: 'modal',
    callback_id: 'candidate_profile_submit',
    private_metadata: JSON.stringify({ post_kind: 'candidate_profile' }),
    title: modalTitle('Post Candidate'),
    submit: submitLabel('Create Preview'),
    close: submitLabel('Cancel'),
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Structured candidate post*\nKeeps high-signal details without forcing long bios.',
        },
      },
      inputBlock(
        ids.headline[0],
        'Target role(s)',
        plainTextInputElement(ids.headline[1], 'Example: Staff Product Engineer, AI infra'),
      ),
      inputBlock(
        ids.locationSummary[0],
        'Location',
        plainTextInputElement(ids.locationSummary[1], 'Current location and location constraints'),
      ),
      inputBlock(
        ids.workArrangement[0],
        'Work arrangement preference',
        staticSelectElement(ids.workArrangement[1], 'Select preference', WORK_ARRANGEMENT_OPTIONS),
      ),
      inputBlock(
        ids.availabilityStatus[0],
        'Availability status',
        staticSelectElement(ids.availabilityStatus[1], 'Select availability', CANDIDATE_AVAILABILITY_OPTIONS),
      ),
      inputBlock(
        ids.compensationDisclosure[0],
        'Compensation disclosure',
        staticSelectElement(ids.compensationDisclosure[1], 'Select compensation status', COMP_DISCLOSURE_OPTIONS),
      ),
      inputBlock(
        ids.compensationTarget[0],
        'Compensation target',
        plainTextInputElement(ids.compensationTarget[1], 'Example: $190k+ base or $120/hr'),
        true,
      ),
      inputBlock(
        ids.visaPolicy[0],
        'Work authorization / visa',
        staticSelectElement(ids.visaPolicy[1], 'Select visa context', VISA_POLICY_OPTIONS),
      ),
      inputBlock(
        ids.relationship[0],
        'Poster relationship',
        staticSelectElement(ids.relationship[1], 'Select relationship', RELATIONSHIP_OPTIONS_CANDIDATE),
      ),
      inputBlock(
        ids.channelFocus[0],
        'Channel focus',
        staticSelectElement(ids.channelFocus[1], 'Auto-pick or override', CHANNEL_FOCUS_OPTIONS, CHANNEL_FOCUS.AUTO),
        false,
        'Auto-pick helps route remote, consulting, or cofounder-focused availability.',
      ),
      inputBlock(
        ids.links[0],
        'Links',
        plainTextInputElement(ids.links[1], 'Portfolio, resume, LinkedIn, GitHub (comma-separated)'),
        true,
      ),
      inputBlock(
        ids.skills[0],
        'Skills',
        plainTextInputElement(ids.skills[1], 'Comma-separated: React, Rails, Product design'),
        true,
      ),
      inputBlock(
        ids.notes[0],
        'Notes',
        plainTextInputElement(ids.notes[1], 'Relevant context for recruiters and hiring managers', { multiline: true }),
        true,
      ),
      {
        type: 'input',
        block_id: ids.allowThreadQuestions[0],
        optional: true,
        label: plainText('Thread behavior'),
        element: {
          type: 'checkboxes',
          action_id: ids.allowThreadQuestions[1],
          options: [
            {
              text: plainText('Open to thread replies on this profile'),
              value: 'allow_thread_questions',
            },
          ],
        },
      },
    ],
  };
}

module.exports = {
  buildCandidateModal,
  buildJobModal,
};
