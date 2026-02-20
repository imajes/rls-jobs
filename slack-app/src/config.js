const REQUIRED_ENV_VARS = ['SLACK_APP_TOKEN', 'SLACK_BOT_TOKEN'];

const RECOMMENDED_PUBLISH_ENV_VARS = [
  'RLS_CHANNEL_JOBS_ID',
  'RLS_CHANNEL_ONSITE_JOBS_ID',
  'RLS_CHANNEL_REMOTE_JOBS_ID',
  'RLS_CHANNEL_JOBS_COFOUNDERS_ID',
  'RLS_CHANNEL_JOBS_CONSULTING_ID',
];

const RECOMMENDED_AUTH_ENV_VARS = ['RLS_JOBS_API_AUTH_LINK_URL'];

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOperationMode(value) {
  return String(value || 'normal')
    .trim()
    .toLowerCase() === 'beta'
    ? 'beta'
    : 'normal';
}

function getConfig() {
  const operationMode = parseOperationMode(process.env.RLS_OPERATION_MODE);

  return {
    appToken: process.env.SLACK_APP_TOKEN,
    botToken: process.env.SLACK_BOT_TOKEN,
    logLevel: process.env.SLACK_LOG_LEVEL || 'INFO',
    operationMode,
    channelIds: {
      jobs: process.env.RLS_CHANNEL_JOBS_ID || '',
      onsiteJobs: process.env.RLS_CHANNEL_ONSITE_JOBS_ID || '',
      remoteJobs: process.env.RLS_CHANNEL_REMOTE_JOBS_ID || '',
      jobsCofounders: process.env.RLS_CHANNEL_JOBS_COFOUNDERS_ID || '',
      jobsConsulting: process.env.RLS_CHANNEL_JOBS_CONSULTING_ID || '',
      jobsBeta: process.env.RLS_CHANNEL_JOBS_BETA_ID || '',
    },
    jobsApi: {
      ingestUrl: process.env.RLS_JOBS_API_INGEST_URL || '',
      postingsUrl: process.env.RLS_JOBS_API_POSTINGS_URL || '',
      authLinkUrl: process.env.RLS_JOBS_API_AUTH_LINK_URL || '',
      token: process.env.RLS_JOBS_API_TOKEN || '',
      timeoutMs: process.env.RLS_JOBS_API_TIMEOUT_MS || '5000',
      readEnabled: parseBoolean(process.env.RLS_API_READ_ENABLED, false),
    },
    outbox: {
      enabled: parseBoolean(process.env.RLS_OUTBOX_ENABLED, false),
      path: process.env.RLS_OUTBOX_PATH || 'storage/ingest-outbox.ndjson',
      deadPath: process.env.RLS_OUTBOX_DEAD_PATH || 'storage/ingest-outbox.dead.ndjson',
      flushIntervalMs: parseInteger(process.env.RLS_OUTBOX_FLUSH_INTERVAL_MS, 15000),
      retryMaxAttempts: parseInteger(process.env.RLS_INGEST_RETRY_MAX_ATTEMPTS, 10),
      retryBaseMs: parseInteger(process.env.RLS_INGEST_RETRY_BASE_MS, 1000),
      backlogWarn: parseInteger(process.env.RLS_OUTBOX_BACKLOG_WARN, 25),
      backlogCritical: parseInteger(process.env.RLS_OUTBOX_BACKLOG_CRITICAL, 100),
    },
    moderation: {
      enabled: parseBoolean(process.env.RLS_MODERATION_ENABLED, true),
      newAccountDays: parseInteger(process.env.RLS_NEW_ACCOUNT_DAYS, 14),
      modQueueChannelId: process.env.RLS_MOD_QUEUE_CHANNEL_ID || '',
    },
    cache: {
      postingsTtlMs: parseInteger(process.env.RLS_POSTINGS_CACHE_TTL_MS, 60000),
    },
    alerts: {
      enabled: parseBoolean(process.env.RLS_ALERTS_ENABLED, true),
      slackWebhookUrl: process.env.RLS_ALERTS_SLACK_WEBHOOK_URL || '',
      minIntervalSeconds: parseInteger(process.env.RLS_ALERTS_MIN_INTERVAL_SECONDS, 900),
    },
  };
}

function getMissingRequiredEnv() {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

function getMissingRecommendedPublishEnv() {
  const operationMode = parseOperationMode(process.env.RLS_OPERATION_MODE);
  const keys = operationMode === 'beta' ? ['RLS_CHANNEL_JOBS_BETA_ID'] : RECOMMENDED_PUBLISH_ENV_VARS;
  return keys.filter((key) => !process.env[key]);
}

function getMissingRecommendedAuthEnv() {
  return RECOMMENDED_AUTH_ENV_VARS.filter((key) => !process.env[key]);
}

module.exports = {
  getConfig,
  getMissingRecommendedAuthEnv,
  getMissingRecommendedPublishEnv,
  getMissingRequiredEnv,
  RECOMMENDED_AUTH_ENV_VARS,
  RECOMMENDED_PUBLISH_ENV_VARS,
  REQUIRED_ENV_VARS,
};
