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
  };
}

module.exports = { getConfig };
