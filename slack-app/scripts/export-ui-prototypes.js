const fs = require('node:fs');
const path = require('node:path');

const { recommendChannel } = require('../src/channel-routing');
const { POST_KIND } = require('../src/constants');
const { buildCandidateModal, buildJobModal } = require('../src/modals');
const { candidatePreviewMessage, jobPreviewMessage } = require('../src/preview-messages');

const outputDir = path.join(__dirname, '..', 'ui-prototypes');

const sampleJobValues = {
  companyName: 'Steady Orbit Labs',
  stealthCompany: false,
  roleTitle: 'Senior Platform Engineer',
  employmentType: 'full_time',
  locationSummary: 'Hybrid in NYC (2 days onsite)',
  workArrangement: 'hybrid',
  compensationDisclosure: 'range_provided',
  compensationRange: '$185k - $230k base + equity',
  visaPolicy: 'case_by_case',
  relationship: 'hiring_manager',
  channelFocus: 'auto',
  jobUrl: 'https://example.com/jobs/senior-platform-engineer',
  skills: 'Ruby, Postgres, AWS, Terraform',
  description:
    'Build and scale data-heavy systems, improve reliability posture, and partner with product engineering teams.',
  allowThreadQuestions: true,
};

const sampleCandidateValues = {
  headline: 'Staff Product Engineer / Engineering Manager',
  locationSummary: 'Seattle, WA, open to remote roles in US time zones',
  workArrangement: 'remote',
  compensationDisclosure: 'range_provided',
  compensationTarget: '$210k+ base, open to total comp discussion',
  visaPolicy: 'unknown',
  relationship: 'candidate_self',
  availabilityStatus: 'open_to_opportunities',
  channelFocus: 'auto',
  links: 'https://linkedin.com/in/example, https://github.com/example',
  skills: 'JavaScript, TypeScript, Rails, Product strategy',
  notes: 'Open to senior IC and EM roles at mission-driven companies.',
  allowThreadQuestions: true,
};

function writeJson(fileName, payload) {
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function main() {
  ensureOutputDir();

  const jobModal = buildJobModal();
  const candidateModal = buildCandidateModal();

  const jobRecommendation = recommendChannel(POST_KIND.JOB, sampleJobValues);
  const candidateRecommendation = recommendChannel(POST_KIND.CANDIDATE, sampleCandidateValues);

  const jobPreview = jobPreviewMessage('U123PREVIEW', sampleJobValues, jobRecommendation, 'C123JOBS');
  const candidatePreview = candidatePreviewMessage(
    'U123PREVIEW',
    sampleCandidateValues,
    candidateRecommendation,
    'C456REMOTE',
  );

  const generated = [
    writeJson('job-posting-modal.json', jobModal),
    writeJson('candidate-profile-modal.json', candidateModal),
    writeJson('job-preview-message.json', jobPreview),
    writeJson('candidate-preview-message.json', candidatePreview),
  ];

  const index = {
    generated_at: new Date().toISOString(),
    files: generated.map((filePath) => path.basename(filePath)),
    notes: [
      'These files are generated from the current app builders in src/modals.js and src/preview-messages.js.',
      'For Slack Block Kit Builder, paste modal JSON into the Modal surface, and message JSON into the Message surface.',
      'Step Two will add final publish payloads and API-ingestion envelopes.',
    ],
  };

  writeJson('index.json', index);
  console.log(`Generated ${generated.length + 1} prototype file(s) in ${outputDir}`);
}

main();
