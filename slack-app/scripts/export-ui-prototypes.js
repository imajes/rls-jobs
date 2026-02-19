const fs = require('node:fs');
const path = require('node:path');

const { recommendChannel } = require('../src/channel-routing');
const { POST_KIND } = require('../src/constants');
const { buildCandidateDetailsModal, buildJobDetailsModal } = require('../src/details-modals');
const {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildCandidateModal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
  buildJobModal,
} = require('../src/modals');
const { candidatePreviewMessage, jobPreviewMessage } = require('../src/preview-messages');

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
  writeJson('job-full-details-message.json', buildJobDetailsModal(sampleJobValues, 'job_preview_001'));
  writeJson(
    'candidate-full-details-message.json',
    buildCandidateDetailsModal(sampleCandidateValues, 'candidate_preview_001'),
  );
  writeJson('index.json', {
    files: [
      'job-posting-modal.json',
      'candidate-profile-modal.json',
      'job-guided-step-1-modal.json',
      'job-guided-step-2-modal.json',
      'job-guided-step-3-modal.json',
      'candidate-guided-step-1-modal.json',
      'candidate-guided-step-2-modal.json',
      'candidate-guided-step-3-modal.json',
      'job-preview-message.json',
      'candidate-preview-message.json',
      'job-full-details-message.json',
      'candidate-full-details-message.json',
    ],
  });

  console.log(`Exported UI prototypes to ${outputDir}`);
}

main();
