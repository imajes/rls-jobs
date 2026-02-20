const { randomUUID } = require('node:crypto');

const { CHANNEL_LABELS, mapFocusToChannelId, recommendChannel } = require('./channel-routing');
const { createAlerting } = require('./alerting');
const { buildAppHomeView } = require('./app-home');
const { POST_KIND } = require('./constants');
const { buildCandidateDetailsModal, buildJobDetailsModal } = require('./details-modals');
const { IngestOutbox } = require('./ingest-outbox');
const { createAuthLink, getPosting: getPostingFromApi, listPostings, postIntakeEvent } = require('./jobs-api-client');
const {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildIntakeChooserModal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
} = require('./modals');
const { buildCandidateEditModal, buildJobEditModal } = require('./posting-edit-modals');
const {
  archivePosting,
  createPosting,
  findPostingByMessage,
  getPosting,
  listPostingsByUser,
  syncPostings,
  updatePosting,
} = require('./posting-store');
const { createPostingsCache } = require('./postings-cache');
const {
  createPreview,
  getPreview,
  isPublishedToRoute,
  markPreviewPublished,
  updatePreviewRoute,
} = require('./preview-store');
const {
  archivedPostingMessage,
  candidatePreviewMessage,
  candidatePublishedMessage,
  jobPreviewMessage,
  jobPublishedMessage,
} = require('./preview-messages');
const {
  parseCandidateStep1,
  parseCandidateStep2,
  parseCandidateStep3,
  parseJobStep1,
  parseJobStep2,
  parseJobStep3,
} = require('./submit-parsing');
const {
  validateCandidateStep1,
  validateCandidateStep2,
  validateCandidateStep3,
  validateJobStep1,
  validateJobStep2,
  validateJobStep3,
} = require('./validation');
const { getRadioValue } = require('./view-state');

const BETA_CHANNEL_LABEL = '#rls-jobs-beta';

async function openModal(client, triggerId, view) {
  await client.views.open({
    trigger_id: triggerId,
    view,
  });
}

function parseMetadata(raw) {
  if (!raw) {
    return { data: {} };
  }

  try {
    const metadata = JSON.parse(raw);
    return {
      data: metadata.data || {},
      kind: metadata.kind,
      step: metadata.step,
    };
  } catch (_error) {
    return { data: {} };
  }
}

function parsePostingIdMetadata(raw) {
  if (!raw) {
    return '';
  }

  try {
    const metadata = JSON.parse(raw);
    return metadata.postingId || '';
  } catch (_error) {
    return '';
  }
}

async function sendDm(client, userId, text) {
  await client.chat.postMessage({
    channel: userId,
    text,
  });
}

function inferKindFromCommandText(text) {
  const normalized = (text || '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  if (/(cand|availability|avail|profile|talent|candidate)/.test(normalized)) {
    return POST_KIND.CANDIDATE;
  }

  if (/(job|jobs|role|roles|hire|hiring|opening|openings|opportun)/.test(normalized)) {
    return POST_KIND.JOB;
  }

  return '';
}

function parseRouteValue(rawValue) {
  const [previewId, channelFocus] = (rawValue || '').split('|');
  return { channelFocus, previewId };
}

function isBetaMode(config) {
  return config.operationMode === 'beta';
}

function buildPreviewUiOptions(config) {
  if (isBetaMode(config)) {
    return {
      allowRouteOverride: false,
      routeLockedMessage: '🔒 Beta mode is active. Publishing is locked to #rls-jobs-beta.',
    };
  }

  return {
    allowRouteOverride: true,
    routeLockedMessage: '',
  };
}

function formatAuthExpiry(expiresAt, ttlSeconds) {
  if (expiresAt) {
    return `This link expires at ${expiresAt}.`;
  }
  if (ttlSeconds > 0) {
    const minutes = Math.ceil(ttlSeconds / 60);
    return `This link expires in about ${minutes} minutes.`;
  }
  return 'This link expires shortly.';
}

function parsePostingActionValue(rawValue, body) {
  if (rawValue) {
    return rawValue;
  }

  const channelId = body.container?.channel_id || '';
  const messageTs = body.container?.message_ts || '';
  const posting = findPostingByMessage(channelId, messageTs);
  return posting?.id || '';
}

const CHANNEL_ENV_KEYS = {
  jobs: 'RLS_CHANNEL_JOBS_ID',
  onsite_jobs: 'RLS_CHANNEL_ONSITE_JOBS_ID',
  remote_jobs: 'RLS_CHANNEL_REMOTE_JOBS_ID',
  jobs_cofounders: 'RLS_CHANNEL_JOBS_COFOUNDERS_ID',
  jobs_consulting: 'RLS_CHANNEL_JOBS_CONSULTING_ID',
};

function buildPreviewMessageForRoute(userId, preview, channelFocus, routedChannelId, config) {
  const recommendation = {
    key: channelFocus || preview.recommendation?.key,
    reason: 'user_route_override',
  };
  const previewUi = buildPreviewUiOptions(config);
  if (preview.kind === POST_KIND.JOB) {
    return jobPreviewMessage(userId, preview.values, recommendation, routedChannelId, preview.id, previewUi);
  }

  return candidatePreviewMessage(userId, preview.values, recommendation, routedChannelId, preview.id, previewUi);
}

async function refreshPreviewCard(client, body, preview, channelFocus, routedChannelId, logger, config) {
  const channel = body.container?.channel_id;
  const ts = body.container?.message_ts;
  if (!channel || !ts) {
    return;
  }

  const message = buildPreviewMessageForRoute(body.user.id, preview, channelFocus, routedChannelId, config);

  try {
    await client.chat.update({
      channel,
      ts,
      text: message.text,
      blocks: message.blocks,
    });
  } catch (error) {
    logger.error(error);
  }
}

function resolvePreviewRoute(preview, config) {
  if (isBetaMode(config)) {
    return {
      channelFocus: 'jobs',
      routedChannelId: config.channelIds.jobsBeta,
      channelLabel: BETA_CHANNEL_LABEL,
    };
  }

  const channelIds = config.channelIds;
  const channelFocus = preview.channelFocus || preview.recommendation?.key;
  const routedChannelId = preview.routedChannelId || mapFocusToChannelId(channelFocus, channelIds);
  const channelLabel = CHANNEL_LABELS[channelFocus] || '#jobs';
  return { channelFocus, routedChannelId, channelLabel };
}

function routeMissingConfigMessage(channelFocus, config) {
  if (isBetaMode(config)) {
    return `Beta mode is enabled, but ${BETA_CHANNEL_LABEL} is not configured. Set RLS_CHANNEL_JOBS_BETA_ID and try again.`;
  }

  const label = CHANNEL_LABELS[channelFocus] || '#jobs';
  const envKey = CHANNEL_ENV_KEYS[channelFocus] || 'RLS_CHANNEL_JOBS_ID';
  return `Route is set to ${label}, but no channel ID is configured. Set ${envKey} and try again.`;
}

function enforceBetaCommandChannel(command, config) {
  if (!isBetaMode(config)) {
    return { ok: true };
  }

  if (!config.channelIds.jobsBeta) {
    return {
      ok: false,
      reason: `Beta mode is active but ${BETA_CHANNEL_LABEL} is not configured. Ask an admin to set RLS_CHANNEL_JOBS_BETA_ID.`,
    };
  }

  if (command.channel_id !== config.channelIds.jobsBeta) {
    return {
      ok: false,
      reason: `Beta mode is enabled. Run this command inside ${BETA_CHANNEL_LABEL} only.`,
    };
  }

  return { ok: true };
}

function buildHealthResponse(config, outbox) {
  const queueSize = outbox?.queueSize?.() ?? 0;
  const deadLetters = outbox?.deadLetterCount?.() ?? 0;
  const lastFlushAt = outbox?.lastFlushAt?.() || 'never';
  const apiReadMode = config.jobsApi.readEnabled ? 'enabled' : 'disabled';
  const moderationMode = config.moderation.enabled ? 'enabled' : 'disabled';
  const alertsMode = config.alerts.enabled ? 'enabled' : 'disabled';
  const operationMode = isBetaMode(config) ? `beta (${BETA_CHANNEL_LABEL})` : 'normal';

  const text =
    '*RLS Jobs health snapshot*\n' +
    `• Outbox queue: ${queueSize}\n` +
    `• Dead-letter count: ${deadLetters}\n` +
    `• Last outbox flush: ${lastFlushAt}\n` +
    `• API read mode: ${apiReadMode}\n` +
    `• Moderation mode: ${moderationMode}\n` +
    `• Alerting mode: ${alertsMode}\n` +
    `• Operation mode: ${operationMode}`;

  return {
    response_type: 'ephemeral',
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}

function createOutboxBacklogMonitor({ config, outbox, alerting }) {
  const state = {
    level: 'normal',
    recoveryBeganAt: 0,
  };

  function currentLevel(size) {
    if (size >= config.outbox.backlogCritical) {
      return 'critical';
    }
    if (size >= config.outbox.backlogWarn) {
      return 'warning';
    }
    return 'normal';
  }

  async function check() {
    const queueSize = outbox.queueSize();
    const level = currentLevel(queueSize);
    const now = Date.now();
    const recoveryWindowMs = alerting.minIntervalSeconds() * 1000;

    if (level === 'normal') {
      if (state.level !== 'normal') {
        if (!state.recoveryBeganAt) {
          state.recoveryBeganAt = now;
        }

        if (now - state.recoveryBeganAt >= recoveryWindowMs) {
          const previous = state.level;
          state.level = 'normal';
          state.recoveryBeganAt = 0;
          await alerting.emit({
            severity: 'warning',
            code: 'SLACK_OUTBOX_BACKLOG_HIGH_RECOVERED',
            message: 'Slack outbox backlog has recovered below warning threshold.',
            fingerprint: 'global',
            context: {
              previous_level: previous,
              queue_size: queueSize,
              warn_threshold: config.outbox.backlogWarn,
              critical_threshold: config.outbox.backlogCritical,
            },
          });
        }
      }
      return;
    }

    state.recoveryBeganAt = 0;
    if (state.level === level) {
      return;
    }

    state.level = level;
    await alerting.emit({
      severity: level,
      code: 'SLACK_OUTBOX_BACKLOG_HIGH',
      message: 'Slack outbox backlog exceeded threshold.',
      fingerprint: 'global',
      context: {
        queue_size: queueSize,
        warn_threshold: config.outbox.backlogWarn,
        critical_threshold: config.outbox.backlogCritical,
      },
    });
  }

  const intervalMs = Math.max(5000, Number(config.outbox.flushIntervalMs || 15000));
  const timer = setInterval(() => {
    check().catch(() => {});
  }, intervalMs);
  if (timer.unref) {
    timer.unref();
  }

  return {
    stop() {
      clearInterval(timer);
    },
    check,
  };
}

function createHomePostingsLoader(config, logger, postingsCache, alerting) {
  return async (userId) => {
    const localPostings = listPostingsByUser(userId);

    if (!config.jobsApi.readEnabled) {
      return localPostings;
    }

    const cached = postingsCache.get(userId);
    if (cached && !cached.stale) {
      return cached.postings;
    }

    const apiResult = await listPostings(
      config,
      {
        posterUserId: userId,
        status: 'all',
        limit: 50,
      },
      logger,
    );

    if (apiResult.fetched) {
      syncPostings(apiResult.postings);
      const merged = listPostingsByUser(userId);
      postingsCache.set(userId, merged);
      return merged;
    }

    if (cached?.postings?.length) {
      logger.warn(`jobs_api_read_fallback source=stale_cache reason=${apiResult.reason}`);
      await alerting.emit({
        severity: 'warning',
        code: 'SLACK_API_READ_FALLBACK_ACTIVE',
        message: 'App Home API read fallback is active; serving stale cache.',
        fingerprint: 'stale_cache',
        context: {
          source: 'stale_cache',
          reason: apiResult.reason || 'unknown',
          user_id: userId,
        },
      });
      return cached.postings;
    }

    logger.warn(`jobs_api_read_fallback source=local_store reason=${apiResult.reason}`);
    await alerting.emit({
      severity: 'warning',
      code: 'SLACK_API_READ_FALLBACK_ACTIVE',
      message: 'App Home API read fallback is active; serving local in-memory store.',
      fingerprint: 'local_store',
      context: {
        source: 'local_store',
        reason: apiResult.reason || 'unknown',
        user_id: userId,
      },
    });
    postingsCache.set(userId, localPostings);
    return localPostings;
  };
}

async function publishHome(client, userId, logger, getPostingsForHome, config) {
  try {
    const postings = await getPostingsForHome(userId);
    await client.views.publish({
      user_id: userId,
      view: buildAppHomeView(postings, { operationMode: config.operationMode }),
    });
  } catch (error) {
    logger.error(error);
  }
}

function messageForPosting(posting) {
  if (posting.kind === POST_KIND.JOB) {
    return jobPublishedMessage(posting.channelId, posting.values, posting.id, posting.posterUserId);
  }
  return candidatePublishedMessage(posting.channelId, posting.values, posting.id, posting.posterUserId);
}

function buildIngestPayload({
  eventType,
  previewId = '',
  posting,
  teamId = '',
  actorUserId = '',
  values = {},
  moderation = {},
  extra = {},
}) {
  const channelLabel = posting.channelLabel || CHANNEL_LABELS[posting.channelFocus] || '#jobs';

  return {
    payloadVersion: 1,
    eventType,
    kind: posting.kind,
    previewId,
    postingId: posting.id,
    permalink: posting.permalink || '',
    route: {
      channelFocus: posting.channelFocus || '',
      channelId: posting.channelId || '',
      channelLabel,
    },
    slack: {
      teamId,
      previewDmChannelId: extra.previewDmChannelId || '',
      previewDmMessageTs: extra.previewDmMessageTs || '',
      publishedMessageTs: posting.messageTs || '',
      publishedByUserId: actorUserId,
    },
    moderation,
    values,
    ...extra,
  };
}

async function postLifecycleIngestEvent(config, logger, payload, outbox) {
  if (!config.jobsApi?.ingestUrl) {
    return;
  }

  if (!outbox) {
    return;
  }

  const ingestResult = await outbox.enqueueAndDeliver(payload);
  if (!ingestResult.sent && ingestResult.reason !== 'not_configured') {
    logger.warn(`jobs_api_ingest_not_sent reason=${ingestResult.reason} event=${payload.eventType}`);
  }
}

async function fetchModerationMetadata(client, config, userId, logger) {
  if (!config.moderation.enabled) {
    return {
      enabled: false,
      flagged: false,
      reason: 'moderation_disabled',
      accountAgeDays: null,
      thresholdDays: config.moderation.newAccountDays,
    };
  }

  try {
    const response = await client.users.info({ user: userId });
    const createdSeconds = Number(response.user?.created || 0);
    if (!createdSeconds) {
      return {
        enabled: true,
        flagged: false,
        reason: 'missing_user_created',
        accountAgeDays: null,
        thresholdDays: config.moderation.newAccountDays,
      };
    }

    const accountAgeDays = Math.max(0, Math.floor((Date.now() / 1000 - createdSeconds) / 86400));
    const flagged = accountAgeDays < config.moderation.newAccountDays;

    return {
      enabled: true,
      flagged,
      reason: flagged ? `account_age_lt_${config.moderation.newAccountDays}` : '',
      accountAgeDays,
      thresholdDays: config.moderation.newAccountDays,
    };
  } catch (error) {
    logger.warn('moderation_lookup_failed', error);
    return {
      enabled: true,
      flagged: false,
      reason: 'lookup_failed',
      accountAgeDays: null,
      thresholdDays: config.moderation.newAccountDays,
    };
  }
}

async function notifyModerationQueueIfNeeded(client, config, posting, moderation, logger) {
  if (!moderation?.flagged || !config.moderation.modQueueChannelId) {
    return;
  }

  try {
    await client.chat.postMessage({
      channel: config.moderation.modQueueChannelId,
      text: `Moderation flag: ${posting.kind} ${posting.id} by <@${posting.posterUserId}> (${moderation.reason || 'unspecified'})`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              '*Moderation flag detected*\n' +
              `• Posting: \`${posting.id}\`\n` +
              `• Kind: ${posting.kind}\n` +
              `• Poster: <@${posting.posterUserId}>\n` +
              `• Account age: ${moderation.accountAgeDays ?? 'unknown'} days\n` +
              `• Reason: ${moderation.reason || 'unspecified'}`,
          },
        },
        posting.permalink
          ? {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Open Slack Post',
                    emoji: true,
                  },
                  url: posting.permalink,
                  action_id: 'moderation_queue_open_post',
                },
              ],
            }
          : {
              type: 'context',
              elements: [{ type: 'plain_text', text: 'Permalink unavailable', emoji: true }],
            },
      ],
    });
  } catch (error) {
    logger.warn('moderation_queue_notify_failed', error);
  }
}

async function postingFromAction(body, config, logger) {
  const actionValue = body.actions?.[0]?.value || '';
  const postingId = parsePostingActionValue(actionValue, body);
  if (!postingId) {
    return null;
  }

  const localPosting = getPosting(postingId);
  if (localPosting) {
    return localPosting;
  }

  if (!config.jobsApi.readEnabled) {
    return null;
  }

  const apiResult = await getPostingFromApi(config, postingId, logger);
  if (!apiResult.fetched) {
    return null;
  }

  syncPostings([apiResult.posting]);
  return getPosting(postingId);
}

async function requirePostingOwner(client, userId, posting, actionLabel) {
  if (!posting) {
    await sendDm(client, userId, 'That posting was not found. It may have expired from memory.');
    return false;
  }

  if (posting.posterUserId !== userId) {
    await sendDm(client, userId, `Only the original poster can ${actionLabel} this posting.`);
    return false;
  }

  return true;
}

async function publishPreview({
  body,
  client,
  config,
  logger,
  previewId,
  expectedKind,
  outbox,
  postingsCache,
  getPostingsForHome,
}) {
  const preview = getPreview(previewId);
  if (!preview) {
    await sendDm(client, body.user.id, 'That preview expired. Please submit again.');
    return;
  }

  if (expectedKind && preview.kind !== expectedKind) {
    await sendDm(client, body.user.id, 'This publish action does not match the preview type.');
    return;
  }

  const { channelFocus, routedChannelId, channelLabel } = resolvePreviewRoute(preview, config);
  if (!routedChannelId) {
    await sendDm(client, body.user.id, routeMissingConfigMessage(channelFocus, config));
    return;
  }

  if (isPublishedToRoute(previewId, routedChannelId)) {
    const label = channelLabel || CHANNEL_LABELS[channelFocus] || '#jobs';
    await sendDm(client, body.user.id, `This preview is already published to ${label}.`);
    return;
  }

  const postingId = randomUUID();
  const message =
    preview.kind === POST_KIND.JOB
      ? jobPublishedMessage(routedChannelId, preview.values, postingId, body.user.id)
      : candidatePublishedMessage(routedChannelId, preview.values, postingId, body.user.id);

  const posted = await client.chat.postMessage(message);
  markPreviewPublished(previewId, routedChannelId, posted.ts);

  let permalink = '';
  try {
    const response = await client.chat.getPermalink({
      channel: routedChannelId,
      message_ts: posted.ts,
    });
    permalink = response.permalink || '';
  } catch (error) {
    logger.warn('unable_to_get_permalink', error);
  }

  const label = channelLabel || CHANNEL_LABELS[channelFocus] || '#jobs';
  await sendDm(client, body.user.id, permalink ? `Published to ${label}: ${permalink}` : `Published to ${label}.`);
  const moderation = await fetchModerationMetadata(client, config, body.user.id, logger);

  const posting = createPosting({
    id: postingId,
    kind: preview.kind,
    values: preview.values,
    posterUserId: body.user.id,
    channelId: routedChannelId,
    channelFocus,
    channelLabel: label,
    messageTs: posted.ts || '',
    permalink,
    moderation,
  });

  postingsCache.evict(body.user.id);
  await publishHome(client, body.user.id, logger, getPostingsForHome, config);
  await notifyModerationQueueIfNeeded(client, config, posting, moderation, logger);

  await postLifecycleIngestEvent(
    config,
    logger,
    buildIngestPayload({
      eventType: 'slack_post_published',
      previewId: preview.id,
      posting,
      teamId: body.team?.id || '',
      actorUserId: body.user.id,
      values: preview.values,
      moderation,
      extra: {
        postedAt: new Date().toISOString(),
        previewDmChannelId: body.container?.channel_id || '',
        previewDmMessageTs: body.container?.message_ts || '',
      },
    }),
    outbox,
  );
}

function registerHandlers(app, config) {
  const alerting = createAlerting({
    service: 'slack-app',
    logger: app.logger,
    enabled: config.alerts.enabled,
    webhookUrl: config.alerts.slackWebhookUrl,
    minIntervalSeconds: config.alerts.minIntervalSeconds,
  });
  const postingsCache = createPostingsCache({ ttlMs: config.cache.postingsTtlMs });
  const getPostingsForHome = createHomePostingsLoader(config, app.logger, postingsCache, alerting);
  const outbox = new IngestOutbox({
    enabled: config.outbox.enabled,
    outboxPath: config.outbox.path,
    deadPath: config.outbox.deadPath,
    flushIntervalMs: config.outbox.flushIntervalMs,
    retryMaxAttempts: config.outbox.retryMaxAttempts,
    retryBaseMs: config.outbox.retryBaseMs,
    deliver: async (payload) => postIntakeEvent(config, payload, app.logger),
    logger: app.logger,
    onDeadLetter: (record) => {
      alerting
        .emit({
          severity: 'critical',
          code: 'SLACK_OUTBOX_DEAD_LETTERED',
          message: 'Lifecycle ingest event moved to dead-letter queue.',
          fingerprint: record.event_id || 'unknown',
          context: {
            event_id: record.event_id || '',
            posting_id: record.payload?.postingId || '',
            event_type: record.payload?.eventType || '',
            reason: record.last_error || 'unknown_error',
            attempts: Number(record.attempts || 0),
          },
        })
        .catch(() => {});
    },
  });
  outbox.start();
  const outboxMonitor = createOutboxBacklogMonitor({ config, outbox, alerting });
  app.__rlsOutbox = outbox;
  app.__rlsOutboxMonitor = outboxMonitor;

  app.shortcut('post_job_shortcut', async ({ ack, body, client, logger }) => {
    await ack();
    try {
      await openModal(client, body.trigger_id, buildJobGuidedStep1Modal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.shortcut('post_candidate_shortcut', async ({ ack, body, client, logger }) => {
    await ack();
    try {
      await openModal(client, body.trigger_id, buildCandidateGuidedStep1Modal());
    } catch (error) {
      logger.error(error);
    }
  });

  const intakeCommandHandler = async ({ ack, command, client, logger }) => {
    await ack();
    const betaCheck = enforceBetaCommandChannel(command, config);
    if (!betaCheck.ok) {
      await sendDm(client, command.user_id, betaCheck.reason);
      return;
    }

    const inferredKind = inferKindFromCommandText(command.text || '');
    const initialView =
      inferredKind === POST_KIND.CANDIDATE
        ? buildCandidateGuidedStep1Modal()
        : inferredKind === POST_KIND.JOB
          ? buildJobGuidedStep1Modal()
          : buildIntakeChooserModal();

    try {
      await openModal(client, command.trigger_id, initialView);
    } catch (error) {
      logger.error(error);
    }
  };

  app.command('/rls-jobs-intake', intakeCommandHandler);
  app.command('/rls-job-intake', intakeCommandHandler);

  const healthCommandHandler = async ({ ack }) => {
    await ack(buildHealthResponse(config, outbox));
  };

  app.command('/rls-jobs-health', healthCommandHandler);
  app.command('/rls-job-health', healthCommandHandler);

  const authCommandHandler = async ({ ack, command, client, logger }) => {
    await ack();

    const authLinkResult = await createAuthLink(
      config,
      {
        slack_user_id: command.user_id,
        slack_team_id: command.team_id,
        slack_user_name: command.user_name || '',
      },
      logger,
    );

    if (!authLinkResult.sent) {
      const reason =
        authLinkResult.reason === 'not_configured'
          ? 'The auth link API endpoint is not configured yet.'
          : `Could not generate auth link (${authLinkResult.reason}).`;
      await sendDm(
        client,
        command.user_id,
        `${reason} Ask an admin to set RLS_JOBS_API_AUTH_LINK_URL and retry /rls-jobs-auth.`,
      );
      return;
    }

    const expiryMessage = formatAuthExpiry(authLinkResult.expiresAt, authLinkResult.ttlSeconds);
    await sendDm(
      client,
      command.user_id,
      `Secure one-time access link: ${authLinkResult.authUrl}\n${expiryMessage}\nYour browser session has a hard 1-hour max duration.`,
    );
  };

  app.command('/rls-jobs-auth', authCommandHandler);
  app.command('/rls-job-auth', authCommandHandler);

  app.event('app_home_opened', async ({ event, client, logger }) => {
    await publishHome(client, event.user, logger, getPostingsForHome, config);
  });

  app.view('intake_kind_chooser_modal', async ({ ack, logger, view }) => {
    const selectedKind = getRadioValue(view.state.values, 'intake_kind_block', 'intake_kind_action');
    const nextView =
      selectedKind === POST_KIND.CANDIDATE ? buildCandidateGuidedStep1Modal() : buildJobGuidedStep1Modal();

    try {
      await ack({
        response_action: 'update',
        view: nextView,
      });
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('home_new_job', async ({ ack, body, client, logger }) => {
    await ack();
    try {
      await openModal(client, body.trigger_id, buildJobGuidedStep1Modal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('home_new_candidate', async ({ ack, body, client, logger }) => {
    await ack();
    try {
      await openModal(client, body.trigger_id, buildCandidateGuidedStep1Modal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('job_posting_guided_step_1', async ({ ack, logger, view }) => {
    const stepData = parseJobStep1(view.state.values);
    const errors = validateJobStep1(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    try {
      await ack({
        response_action: 'update',
        view: buildJobGuidedStep2Modal(stepData),
      });
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('job_posting_guided_step_2', async ({ ack, logger, view }) => {
    const metadata = parseMetadata(view.private_metadata);
    const stepData = parseJobStep2(view.state.values);
    const errors = validateJobStep2(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    const merged = { ...metadata.data, ...stepData };

    try {
      await ack({
        response_action: 'update',
        view: buildJobGuidedStep3Modal(merged),
      });
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('job_posting_guided_step_3', async ({ ack, body, client, logger, view }) => {
    const metadata = parseMetadata(view.private_metadata);
    const stepData = parseJobStep3(view.state.values);
    const errors = validateJobStep3(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    const values = { ...metadata.data, ...stepData, posterUserId: body.user.id };
    await ack();

    const recommendation = isBetaMode(config)
      ? { key: 'jobs', reason: 'beta_mode_forced' }
      : recommendChannel(POST_KIND.JOB, values);
    const routedChannelId = isBetaMode(config)
      ? config.channelIds.jobsBeta
      : mapFocusToChannelId(recommendation.key, config.channelIds);
    const previewId = createPreview(POST_KIND.JOB, values, recommendation, routedChannelId);
    const preview = jobPreviewMessage(
      body.user.id,
      values,
      recommendation,
      routedChannelId,
      previewId,
      buildPreviewUiOptions(config),
    );

    try {
      await client.chat.postMessage(preview);
      const previewRouteLabel = isBetaMode(config) ? BETA_CHANNEL_LABEL : CHANNEL_LABELS[recommendation.key] || '#jobs';
      logger.info(`job_preview_created user=${body.user.id} route=${previewRouteLabel}`);
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('candidate_profile_guided_step_1', async ({ ack, logger, view }) => {
    const stepData = parseCandidateStep1(view.state.values);
    const errors = validateCandidateStep1(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    try {
      await ack({
        response_action: 'update',
        view: buildCandidateGuidedStep2Modal(stepData),
      });
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('candidate_profile_guided_step_2', async ({ ack, logger, view }) => {
    const metadata = parseMetadata(view.private_metadata);
    const stepData = parseCandidateStep2(view.state.values);
    const errors = validateCandidateStep2(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    const merged = { ...metadata.data, ...stepData };

    try {
      await ack({
        response_action: 'update',
        view: buildCandidateGuidedStep3Modal(merged),
      });
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('candidate_profile_guided_step_3', async ({ ack, body, client, logger, view }) => {
    const metadata = parseMetadata(view.private_metadata);
    const stepData = parseCandidateStep3(view.state.values);
    const errors = validateCandidateStep3(stepData);

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    const values = { ...metadata.data, ...stepData, posterUserId: body.user.id };
    await ack();

    const recommendation = isBetaMode(config)
      ? { key: 'jobs', reason: 'beta_mode_forced' }
      : recommendChannel(POST_KIND.CANDIDATE, values);
    const routedChannelId = isBetaMode(config)
      ? config.channelIds.jobsBeta
      : mapFocusToChannelId(recommendation.key, config.channelIds);
    const previewId = createPreview(POST_KIND.CANDIDATE, values, recommendation, routedChannelId);
    const preview = candidatePreviewMessage(
      body.user.id,
      values,
      recommendation,
      routedChannelId,
      previewId,
      buildPreviewUiOptions(config),
    );

    try {
      await client.chat.postMessage(preview);
      const previewRouteLabel = isBetaMode(config) ? BETA_CHANNEL_LABEL : CHANNEL_LABELS[recommendation.key] || '#jobs';
      logger.info(`candidate_preview_created user=${body.user.id} route=${previewRouteLabel}`);
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('job_card_open_details_modal', async ({ ack, body, client, logger }) => {
    await ack();
    const previewId = body.actions?.[0]?.value;
    const preview = getPreview(previewId);

    if (!preview) {
      await sendDm(client, body.user.id, 'That preview expired. Please submit again.');
      return;
    }

    try {
      await openModal(client, body.trigger_id, buildJobDetailsModal(preview.values));
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('candidate_card_open_details_modal', async ({ ack, body, client, logger }) => {
    await ack();
    const previewId = body.actions?.[0]?.value;
    const preview = getPreview(previewId);

    if (!preview) {
      await sendDm(client, body.user.id, 'That preview expired. Please submit again.');
      return;
    }

    try {
      await openModal(client, body.trigger_id, buildCandidateDetailsModal(preview.values));
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('job_published_open_details', async ({ ack, body, client, logger }) => {
    await ack();
    const posting = await postingFromAction(body, config, logger);
    if (!posting) {
      await sendDm(client, body.user.id, 'Posting not found.');
      return;
    }

    try {
      await openModal(client, body.trigger_id, buildJobDetailsModal(posting.values));
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('candidate_published_open_details', async ({ ack, body, client, logger }) => {
    await ack();
    const posting = await postingFromAction(body, config, logger);
    if (!posting) {
      await sendDm(client, body.user.id, 'Posting not found.');
      return;
    }

    try {
      await openModal(client, body.trigger_id, buildCandidateDetailsModal(posting.values));
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('published_post_edit', async ({ ack, body, client, logger }) => {
    await ack();
    const posting = await postingFromAction(body, config, logger);
    const isOwner = await requirePostingOwner(client, body.user.id, posting, 'edit');
    if (!isOwner) {
      return;
    }

    if (posting.status === 'archived') {
      await sendDm(client, body.user.id, 'Archived postings cannot be edited.');
      return;
    }

    try {
      await openModal(
        client,
        body.trigger_id,
        posting.kind === POST_KIND.JOB ? buildJobEditModal(posting) : buildCandidateEditModal(posting),
      );
    } catch (error) {
      logger.error(error);
    }
  });

  app.action('published_post_archive', async ({ ack, body, client, logger }) => {
    await ack();
    const posting = await postingFromAction(body, config, logger);
    const isOwner = await requirePostingOwner(client, body.user.id, posting, 'archive');
    if (!isOwner) {
      return;
    }

    if (posting.status === 'archived') {
      await sendDm(client, body.user.id, 'This posting is already archived.');
      return;
    }

    const archived = archivePosting(posting.id, body.user.id);

    try {
      const archivedMessage = archivedPostingMessage(archived);
      await client.chat.update({
        channel: archived.channelId,
        ts: archived.messageTs,
        text: archivedMessage.text,
        blocks: archivedMessage.blocks,
      });
      await sendDm(client, body.user.id, 'Posting archived.');
      postingsCache.evict(body.user.id);
      await publishHome(client, body.user.id, logger, getPostingsForHome, config);

      await postLifecycleIngestEvent(
        config,
        logger,
        buildIngestPayload({
          eventType: 'slack_post_archived',
          posting: archived,
          teamId: body.team?.id || '',
          actorUserId: body.user.id,
          values: archived.values,
          moderation: archived.moderation || {},
          extra: {
            archivedAt: new Date().toISOString(),
            archivedByUserId: body.user.id,
          },
        }),
        outbox,
      );
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('job_posting_edit_modal', async ({ ack, body, client, logger, view }) => {
    const postingId = parsePostingIdMetadata(view.private_metadata);
    const posting = getPosting(postingId);

    const step1 = parseJobStep1(view.state.values);
    const step2 = parseJobStep2(view.state.values);
    const step3 = parseJobStep3(view.state.values);
    const mergedValues = { ...step1, ...step2, ...step3 };
    const errors = {
      ...validateJobStep1(step1),
      ...validateJobStep2(step2),
      ...validateJobStep3(step3),
    };

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    await ack();

    const isOwner = await requirePostingOwner(client, body.user.id, posting, 'edit');
    if (!isOwner) {
      return;
    }

    updatePosting(posting.id, {
      values: {
        ...posting.values,
        ...mergedValues,
      },
    });

    try {
      const updated = getPosting(posting.id);
      const message = messageForPosting(updated);
      await client.chat.update({
        channel: updated.channelId,
        ts: updated.messageTs,
        text: message.text,
        blocks: message.blocks,
      });
      await sendDm(client, body.user.id, 'Posting updated.');
      postingsCache.evict(body.user.id);
      await publishHome(client, body.user.id, logger, getPostingsForHome, config);

      await postLifecycleIngestEvent(
        config,
        logger,
        buildIngestPayload({
          eventType: 'slack_post_updated',
          posting: updated,
          teamId: body.team?.id || '',
          actorUserId: body.user.id,
          values: updated.values,
          moderation: updated.moderation || {},
          extra: {
            updatedAt: new Date().toISOString(),
          },
        }),
        outbox,
      );
    } catch (error) {
      logger.error(error);
      await sendDm(client, body.user.id, 'Could not update the posted message. Please try again.');
    }
  });

  app.view('candidate_posting_edit_modal', async ({ ack, body, client, logger, view }) => {
    const postingId = parsePostingIdMetadata(view.private_metadata);
    const posting = getPosting(postingId);

    const step1 = parseCandidateStep1(view.state.values);
    const step2 = parseCandidateStep2(view.state.values);
    const step3 = parseCandidateStep3(view.state.values);
    const mergedValues = { ...step1, ...step2, ...step3 };
    const errors = {
      ...validateCandidateStep1(step1),
      ...validateCandidateStep2(step2),
      ...validateCandidateStep3(step3),
    };

    if (Object.keys(errors).length) {
      await ack({ errors, response_action: 'errors' });
      return;
    }

    await ack();

    const isOwner = await requirePostingOwner(client, body.user.id, posting, 'edit');
    if (!isOwner) {
      return;
    }

    updatePosting(posting.id, {
      values: {
        ...posting.values,
        ...mergedValues,
      },
    });

    try {
      const updated = getPosting(posting.id);
      const message = messageForPosting(updated);
      await client.chat.update({
        channel: updated.channelId,
        ts: updated.messageTs,
        text: message.text,
        blocks: message.blocks,
      });
      await sendDm(client, body.user.id, 'Posting updated.');
      postingsCache.evict(body.user.id);
      await publishHome(client, body.user.id, logger, getPostingsForHome, config);

      await postLifecycleIngestEvent(
        config,
        logger,
        buildIngestPayload({
          eventType: 'slack_post_updated',
          posting: updated,
          teamId: body.team?.id || '',
          actorUserId: body.user.id,
          values: updated.values,
          moderation: updated.moderation || {},
          extra: {
            updatedAt: new Date().toISOString(),
          },
        }),
        outbox,
      );
    } catch (error) {
      logger.error(error);
      await sendDm(client, body.user.id, 'Could not update the posted message. Please try again.');
    }
  });

  app.action('job_card_quick_apply', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Quick Apply clicked. We can wire this to a saved shortlist flow next.');
  });

  app.action('job_card_save', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Saved. We can wire this to a personal saved-jobs list in Step Five.');
  });

  app.action('candidate_card_save', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Saved. We can wire this to a saved-candidate list in Step Five.');
  });

  app.action('job_details_save', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Saved from details view.');
  });

  app.action('candidate_details_save', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Saved from details view.');
  });

  app.action('job_details_quick_apply', async ({ ack, body, client }) => {
    await ack();
    await sendDm(client, body.user.id, 'Quick Apply clicked in details view.');
  });

  app.action('job_card_route_channel', async ({ ack, body, client }) => {
    await ack();
    if (isBetaMode(config)) {
      await sendDm(
        client,
        body.user.id,
        `Routing is locked while beta mode is enabled. Destination: ${BETA_CHANNEL_LABEL}.`,
      );
      return;
    }

    const { channelFocus, previewId } = parseRouteValue(body.actions?.[0]?.selected_option?.value);
    const preview = getPreview(previewId);
    if (!preview) {
      await sendDm(client, body.user.id, 'That preview expired. Please submit again.');
      return;
    }

    const routedChannelId = mapFocusToChannelId(channelFocus, config.channelIds);
    updatePreviewRoute(previewId, channelFocus, routedChannelId);
    await refreshPreviewCard(client, body, preview, channelFocus, routedChannelId, app.logger, config);

    const label = CHANNEL_LABELS[channelFocus] || '#jobs';
    if (!routedChannelId) {
      await sendDm(client, body.user.id, routeMissingConfigMessage(channelFocus, config));
      return;
    }
    await sendDm(client, body.user.id, `Route preference captured: ${label}`);
  });

  app.action('candidate_card_route_channel', async ({ ack, body, client }) => {
    await ack();
    if (isBetaMode(config)) {
      await sendDm(
        client,
        body.user.id,
        `Routing is locked while beta mode is enabled. Destination: ${BETA_CHANNEL_LABEL}.`,
      );
      return;
    }

    const { channelFocus, previewId } = parseRouteValue(body.actions?.[0]?.selected_option?.value);
    const preview = getPreview(previewId);
    if (!preview) {
      await sendDm(client, body.user.id, 'That preview expired. Please submit again.');
      return;
    }

    const routedChannelId = mapFocusToChannelId(channelFocus, config.channelIds);
    updatePreviewRoute(previewId, channelFocus, routedChannelId);
    await refreshPreviewCard(client, body, preview, channelFocus, routedChannelId, app.logger, config);

    const label = CHANNEL_LABELS[channelFocus] || '#jobs';
    if (!routedChannelId) {
      await sendDm(client, body.user.id, routeMissingConfigMessage(channelFocus, config));
      return;
    }
    await sendDm(client, body.user.id, `Route preference captured: ${label}`);
  });

  app.action('job_card_publish', async ({ ack, body, client, logger }) => {
    await ack();
    const previewId = body.actions?.[0]?.value;
    try {
      await publishPreview({
        body,
        client,
        config,
        logger,
        previewId,
        expectedKind: POST_KIND.JOB,
        outbox,
        postingsCache,
        getPostingsForHome,
      });
    } catch (error) {
      logger.error(error);
      await sendDm(client, body.user.id, 'Publish failed. Please try again.');
    }
  });

  app.action('candidate_card_publish', async ({ ack, body, client, logger }) => {
    await ack();
    const previewId = body.actions?.[0]?.value;
    try {
      await publishPreview({
        body,
        client,
        config,
        logger,
        previewId,
        expectedKind: POST_KIND.CANDIDATE,
        outbox,
        postingsCache,
        getPostingsForHome,
      });
    } catch (error) {
      logger.error(error);
      await sendDm(client, body.user.id, 'Publish failed. Please try again.');
    }
  });
}

module.exports = { registerHandlers };
