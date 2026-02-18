const POST_KIND = {
  JOB: 'job_posting',
  CANDIDATE: 'candidate_profile',
};

const CHANNEL_FOCUS = {
  AUTO: 'auto',
  JOBS: 'jobs',
  ONSITE: 'onsite_jobs',
  REMOTE: 'remote_jobs',
  COFOUNDER: 'jobs_cofounders',
  CONSULTING: 'jobs_consulting',
};

const WORK_ARRANGEMENT = {
  ONSITE: 'onsite',
  HYBRID: 'hybrid',
  REMOTE: 'remote',
  FLEXIBLE: 'flexible',
};

const COMP_DISCLOSURE = {
  RANGE: 'range_provided',
  NEGOTIABLE: 'negotiable',
  NOT_LISTED: 'not_listed',
  PERFORMANCE_BASED: 'performance_based',
};

const POSTER_RELATIONSHIP = {
  HIRING_MANAGER: 'hiring_manager',
  TEAM_MEMBER: 'team_member',
  RECRUITER: 'recruiter',
  REFERRAL: 'referral',
  CANDIDATE_SELF: 'candidate_self',
  OTHER: 'other',
};

const EMPLOYMENT_TYPE = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  CONTRACT: 'contract',
  CONSULTING: 'consulting',
  COFOUNDER: 'cofounder',
};

const CANDIDATE_AVAILABILITY = {
  ACTIVELY_INTERVIEWING: 'actively_interviewing',
  OPEN_TO_OPPS: 'open_to_opportunities',
  CONTRACT_ONLY: 'contract_only',
  COFOUNDER_ONLY: 'cofounder_only',
};

const VISA_POLICY = {
  YES: 'yes',
  NO: 'no',
  CASE_BY_CASE: 'case_by_case',
  UNKNOWN: 'unknown',
};

const CHANNEL_FOCUS_OPTIONS = [
  { value: CHANNEL_FOCUS.AUTO, text: 'Auto-pick best channel' },
  { value: CHANNEL_FOCUS.JOBS, text: '#jobs (general)' },
  { value: CHANNEL_FOCUS.ONSITE, text: '#onsite-jobs' },
  { value: CHANNEL_FOCUS.REMOTE, text: '#remote-jobs' },
  { value: CHANNEL_FOCUS.COFOUNDER, text: '#jobs-cofounders' },
  { value: CHANNEL_FOCUS.CONSULTING, text: '#jobs-consulting' },
];

const WORK_ARRANGEMENT_OPTIONS = [
  { value: WORK_ARRANGEMENT.ONSITE, text: 'On-site' },
  { value: WORK_ARRANGEMENT.HYBRID, text: 'Hybrid' },
  { value: WORK_ARRANGEMENT.REMOTE, text: 'Remote' },
  { value: WORK_ARRANGEMENT.FLEXIBLE, text: 'Flexible / mixed' },
];

const COMP_DISCLOSURE_OPTIONS = [
  { value: COMP_DISCLOSURE.RANGE, text: 'Range provided' },
  { value: COMP_DISCLOSURE.NEGOTIABLE, text: 'Negotiable / depends' },
  { value: COMP_DISCLOSURE.NOT_LISTED, text: 'Not listed' },
  { value: COMP_DISCLOSURE.PERFORMANCE_BASED, text: 'Commission / variable' },
];

const RELATIONSHIP_OPTIONS_JOB = [
  { value: POSTER_RELATIONSHIP.HIRING_MANAGER, text: 'Hiring manager' },
  { value: POSTER_RELATIONSHIP.TEAM_MEMBER, text: 'Team member / peer' },
  { value: POSTER_RELATIONSHIP.RECRUITER, text: 'Recruiter' },
  { value: POSTER_RELATIONSHIP.REFERRAL, text: 'Will refer / introduce' },
  { value: POSTER_RELATIONSHIP.OTHER, text: 'Other' },
];

const RELATIONSHIP_OPTIONS_CANDIDATE = [
  { value: POSTER_RELATIONSHIP.CANDIDATE_SELF, text: 'I am the candidate' },
  { value: POSTER_RELATIONSHIP.RECRUITER, text: 'Recruiter posting candidate' },
  { value: POSTER_RELATIONSHIP.OTHER, text: 'Other' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: EMPLOYMENT_TYPE.FULL_TIME, text: 'Full-time' },
  { value: EMPLOYMENT_TYPE.PART_TIME, text: 'Part-time' },
  { value: EMPLOYMENT_TYPE.CONTRACT, text: 'Contract' },
  { value: EMPLOYMENT_TYPE.CONSULTING, text: 'Consulting' },
  { value: EMPLOYMENT_TYPE.COFOUNDER, text: 'Cofounder / founding role' },
];

const CANDIDATE_AVAILABILITY_OPTIONS = [
  { value: CANDIDATE_AVAILABILITY.ACTIVELY_INTERVIEWING, text: 'Actively interviewing' },
  { value: CANDIDATE_AVAILABILITY.OPEN_TO_OPPS, text: 'Open to opportunities' },
  { value: CANDIDATE_AVAILABILITY.CONTRACT_ONLY, text: 'Contract / consulting only' },
  { value: CANDIDATE_AVAILABILITY.COFOUNDER_ONLY, text: 'Cofounder only' },
];

const VISA_POLICY_OPTIONS = [
  { value: VISA_POLICY.YES, text: 'Can sponsor visa' },
  { value: VISA_POLICY.NO, text: 'Cannot sponsor visa' },
  { value: VISA_POLICY.CASE_BY_CASE, text: 'Case-by-case' },
  { value: VISA_POLICY.UNKNOWN, text: 'Unknown / not sure' },
];

module.exports = {
  CANDIDATE_AVAILABILITY,
  CANDIDATE_AVAILABILITY_OPTIONS,
  CHANNEL_FOCUS,
  CHANNEL_FOCUS_OPTIONS,
  COMP_DISCLOSURE,
  COMP_DISCLOSURE_OPTIONS,
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_OPTIONS,
  POSTER_RELATIONSHIP,
  POST_KIND,
  RELATIONSHIP_OPTIONS_CANDIDATE,
  RELATIONSHIP_OPTIONS_JOB,
  VISA_POLICY_OPTIONS,
  WORK_ARRANGEMENT,
  WORK_ARRANGEMENT_OPTIONS,
};
