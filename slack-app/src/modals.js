const { POST_KIND } = require('./constants');

const candidateFullTemplate = require('../ui-prototypes/candidate-profile-modal.json');
const candidateStep1Template = require('../ui-prototypes/candidate-guided-step-1-modal.json');
const candidateStep2Template = require('../ui-prototypes/candidate-guided-step-2-modal.json');
const candidateStep3Template = require('../ui-prototypes/candidate-guided-step-3-modal.json');
const jobFullTemplate = require('../ui-prototypes/job-posting-modal.json');
const jobStep1Template = require('../ui-prototypes/job-guided-step-1-modal.json');
const jobStep2Template = require('../ui-prototypes/job-guided-step-2-modal.json');
const jobStep3Template = require('../ui-prototypes/job-guided-step-3-modal.json');

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

module.exports = {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildCandidateModal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
  buildJobModal,
};
