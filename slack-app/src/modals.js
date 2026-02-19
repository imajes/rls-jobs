const { POST_KIND } = require('./constants');

// Runtime source-of-truth templates for guided modal views.
const candidateFullTemplate = require('./modal-templates/candidate-profile-modal.json');
const candidateStep1Template = require('./modal-templates/candidate-guided-step-1-modal.json');
const candidateStep2Template = require('./modal-templates/candidate-guided-step-2-modal.json');
const candidateStep3Template = require('./modal-templates/candidate-guided-step-3-modal.json');
const jobFullTemplate = require('./modal-templates/job-posting-modal.json');
const jobStep1Template = require('./modal-templates/job-guided-step-1-modal.json');
const jobStep2Template = require('./modal-templates/job-guided-step-2-modal.json');
const jobStep3Template = require('./modal-templates/job-guided-step-3-modal.json');

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function clone(template) {
  return JSON.parse(JSON.stringify(template));
}

function privateMetadata(kind, step, data = {}) {
  return JSON.stringify({
    kind,
    flow: 'guided',
    step,
    data,
  });
}

function withMetadata(template, kind, step, data = {}) {
  const view = clone(template);
  view.private_metadata = privateMetadata(kind, step, data);
  return view;
}

function buildJobModal() {
  return clone(jobFullTemplate);
}

function buildCandidateModal() {
  return clone(candidateFullTemplate);
}

function buildJobGuidedStep1Modal(data = {}) {
  return withMetadata(jobStep1Template, POST_KIND.JOB, 1, data);
}

function buildJobGuidedStep2Modal(data = {}) {
  return withMetadata(jobStep2Template, POST_KIND.JOB, 2, data);
}

function buildJobGuidedStep3Modal(data = {}) {
  return withMetadata(jobStep3Template, POST_KIND.JOB, 3, data);
}

function buildCandidateGuidedStep1Modal(data = {}) {
  return withMetadata(candidateStep1Template, POST_KIND.CANDIDATE, 1, data);
}

function buildCandidateGuidedStep2Modal(data = {}) {
  return withMetadata(candidateStep2Template, POST_KIND.CANDIDATE, 2, data);
}

function buildCandidateGuidedStep3Modal(data = {}) {
  return withMetadata(candidateStep3Template, POST_KIND.CANDIDATE, 3, data);
}

function buildIntakeChooserModal() {
  return {
    type: 'modal',
    callback_id: 'intake_kind_chooser_modal',
    title: plainText('Start Intake'),
    submit: plainText('Continue'),
    close: plainText('Cancel'),
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*What would you like to share today?*',
        },
      },
      {
        type: 'input',
        block_id: 'intake_kind_block',
        label: plainText('Posting type'),
        element: {
          type: 'radio_buttons',
          action_id: 'intake_kind_action',
          options: [
            {
              text: plainText('Job listing'),
              value: POST_KIND.JOB,
            },
            {
              text: plainText('Candidate availability'),
              value: POST_KIND.CANDIDATE,
            },
          ],
          initial_option: {
            text: plainText('Job listing'),
            value: POST_KIND.JOB,
          },
        },
      },
      {
        type: 'context',
        elements: [plainText('Tip: you can still pass "job" or "candidate" to the slash command to skip this step.')],
      },
    ],
  };
}

module.exports = {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildCandidateModal,
  buildIntakeChooserModal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
  buildJobModal,
};
