const fs = require('node:fs');
const path = require('node:path');

const { buildAppHomeView } = require('../src/app-home');
const { recommendChannel } = require('../src/channel-routing');
const { POST_KIND } = require('../src/constants');
const { buildCandidateDetailsModal, buildJobDetailsModal } = require('../src/details-modals');
const {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildCandidateModal,
  buildIntakeChooserModal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
  buildJobModal,
} = require('../src/modals');
const { buildCandidateEditModal, buildJobEditModal } = require('../src/posting-edit-modals');
const {
  candidatePreviewMessage,
  candidatePublishedMessage,
  jobPreviewMessage,
  jobPublishedMessage,
} = require('../src/preview-messages');

const outputDir = path.join(__dirname, '..', 'ui-prototypes');

const sampleJobValues = {
  companyName: 'Steady Orbit Labs',
  roleTitle: 'Senior Platform Engineer',
  locationSummary: 'Hybrid in NYC (2 days onsite)',
  workArrangements: ['hybrid', 'onsite'],
  employmentTypes: ['full_time', 'contract'],
  compensationValue: '$185k-$230k USD',
  compensationComponents: ['equity', 'bonus'],
  visaPolicy: 'case_by_case',
  relationship: 'hiring_manager',
  links: 'https://example.com/jobs/senior-platform-engineer\nhttps://steadyorbitlabs.com/careers/platform-engineering',
  skills: 'Ruby, Postgres, AWS, Terraform',
  summary:
    'Build and scale data-heavy systems, improve reliability posture, and partner closely with product engineering teams.',
  allowThreadQuestions: true,
};

const sampleCandidateValues = {
  headline: 'Staff Product Engineer / Engineering Manager',
  locationSummary: 'Seattle, WA, open to US remote roles',
  workArrangements: ['remote', 'hybrid'],
  availabilityModes: ['open_to_opportunities'],
  engagementTypes: ['full_time', 'contract'],
  compensationDisclosure: 'range_provided',
  compensationValue: '$210k+ base',
  compensationComponents: ['equity', 'bonus'],
  visaPolicy: 'unknown',
  relationship: 'candidate_self',
  links: 'https://linkedin.com/in/example\nhttps://github.com/example',
  skills: 'JavaScript, TypeScript, Rails, Product strategy',
  notes: 'Open to senior IC and EM roles at mission-driven companies.',
  allowThreadQuestions: true,
};

const sampleJobPosting = {
  id: 'posting_job_001',
  kind: POST_KIND.JOB,
  values: sampleJobValues,
  posterUserId: 'U123POSTER',
  status: 'active',
  createdAt: Date.parse('2026-02-19T00:00:00Z'),
  updatedAt: Date.parse('2026-02-19T00:00:00Z'),
  permalink: 'https://slack.com/app_redirect?channel=C123PUBLISHED',
};

const sampleCandidatePosting = {
  id: 'posting_candidate_001',
  kind: POST_KIND.CANDIDATE,
  values: sampleCandidateValues,
  posterUserId: 'U123POSTER',
  status: 'archived',
  createdAt: Date.parse('2026-02-17T00:00:00Z'),
  updatedAt: Date.parse('2026-02-19T00:00:00Z'),
  permalink: 'https://slack.com/app_redirect?channel=C123PUBLISHED',
};

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function main() {
  ensureOutputDir();

  const jobRecommendation = recommendChannel(POST_KIND.JOB, sampleJobValues);
  const candidateRecommendation = recommendChannel(POST_KIND.CANDIDATE, sampleCandidateValues);

  writeJson('job-posting-modal.json', buildJobModal());
  writeJson('candidate-profile-modal.json', buildCandidateModal());
  writeJson('intake-chooser-modal.json', buildIntakeChooserModal());
  writeJson('job-guided-step-1-modal.json', buildJobGuidedStep1Modal());
  writeJson('job-guided-step-2-modal.json', buildJobGuidedStep2Modal(sampleJobValues));
  writeJson('job-guided-step-3-modal.json', buildJobGuidedStep3Modal(sampleJobValues));
  writeJson('candidate-guided-step-1-modal.json', buildCandidateGuidedStep1Modal());
  writeJson('candidate-guided-step-2-modal.json', buildCandidateGuidedStep2Modal(sampleCandidateValues));
  writeJson('candidate-guided-step-3-modal.json', buildCandidateGuidedStep3Modal(sampleCandidateValues));
  writeJson(
    'job-preview-message.json',
    jobPreviewMessage('U123PREVIEW', sampleJobValues, jobRecommendation, 'C123ONSITE', 'job_preview_001'),
  );
  writeJson(
    'candidate-preview-message.json',
    candidatePreviewMessage(
      'U123PREVIEW',
      sampleCandidateValues,
      candidateRecommendation,
      'C456REMOTE',
      'candidate_preview_001',
    ),
  );
  writeJson(
    'job-published-message.json',
    jobPublishedMessage('C123PUBLISHED', sampleJobValues, 'job_preview_001', 'U123POSTER'),
  );
  writeJson(
    'candidate-published-message.json',
    candidatePublishedMessage('C123PUBLISHED', sampleCandidateValues, 'candidate_preview_001', 'U123POSTER'),
  );
  writeJson('job-edit-modal.json', buildJobEditModal(sampleJobPosting));
  writeJson('candidate-edit-modal.json', buildCandidateEditModal(sampleCandidatePosting));
  writeJson('app-home-view.json', buildAppHomeView([sampleJobPosting, sampleCandidatePosting]));
  writeJson('job-full-details-message.json', buildJobDetailsModal(sampleJobValues));
  writeJson('candidate-full-details-message.json', buildCandidateDetailsModal(sampleCandidateValues));
  writeJson('index.json', {
    files: [
      'job-posting-modal.json',
      'candidate-profile-modal.json',
      'intake-chooser-modal.json',
      'job-guided-step-1-modal.json',
      'job-guided-step-2-modal.json',
      'job-guided-step-3-modal.json',
      'candidate-guided-step-1-modal.json',
      'candidate-guided-step-2-modal.json',
      'candidate-guided-step-3-modal.json',
      'job-preview-message.json',
      'candidate-preview-message.json',
      'job-published-message.json',
      'candidate-published-message.json',
      'job-edit-modal.json',
      'candidate-edit-modal.json',
      'app-home-view.json',
      'job-full-details-message.json',
      'candidate-full-details-message.json',
    ],
  });

  console.log(`Exported UI prototypes to ${outputDir}`);
}

main();
