const REQUIRED_ENV_VARS = ['SLACK_APP_TOKEN', 'SLACK_BOT_TOKEN'];

const RECOMMENDED_PUBLISH_ENV_VARS = [
  'RLS_CHANNEL_JOBS_ID',
  'RLS_CHANNEL_ONSITE_JOBS_ID',
  'RLS_CHANNEL_REMOTE_JOBS_ID',
  'RLS_CHANNEL_JOBS_COFOUNDERS_ID',
  'RLS_CHANNEL_JOBS_CONSULTING_ID',
];

function getConfig() {
  return {
    appToken: process.env.SLACK_APP_TOKEN,
    botToken: process.env.SLACK_BOT_TOKEN,
    logLevel: process.env.SLACK_LOG_LEVEL || 'INFO',
    channelIds: {
      jobs: process.env.RLS_CHANNEL_JOBS_ID || '',
      onsiteJobs: process.env.RLS_CHANNEL_ONSITE_JOBS_ID || '',
      remoteJobs: process.env.RLS_CHANNEL_REMOTE_JOBS_ID || '',
      jobsCofounders: process.env.RLS_CHANNEL_JOBS_COFOUNDERS_ID || '',
      jobsConsulting: process.env.RLS_CHANNEL_JOBS_CONSULTING_ID || '',
    },
    jobsApi: {
      ingestUrl: process.env.RLS_JOBS_API_INGEST_URL || '',
      token: process.env.RLS_JOBS_API_TOKEN || '',
      timeoutMs: process.env.RLS_JOBS_API_TIMEOUT_MS || '5000',
    },
  };
}

function getMissingRequiredEnv() {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

function getMissingRecommendedPublishEnv() {
  return RECOMMENDED_PUBLISH_ENV_VARS.filter((key) => !process.env[key]);
}

module.exports = {
  getConfig,
  getMissingRecommendedPublishEnv,
  getMissingRequiredEnv,
  RECOMMENDED_PUBLISH_ENV_VARS,
  REQUIRED_ENV_VARS,
};
