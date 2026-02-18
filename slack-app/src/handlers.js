const { CHANNEL_LABELS, mapFocusToChannelId, recommendChannel } = require('./channel-routing');
const { POST_KIND } = require('./constants');
const { buildCandidateModal, buildJobModal } = require('./modals');
const { candidatePreviewMessage, jobPreviewMessage } = require('./preview-messages');
const { parseCandidateSubmission, parseJobSubmission } = require('./submit-parsing');
const { validateCandidateSubmission, validateJobSubmission } = require('./validation');

async function openModal(client, triggerId, view) {
  await client.views.open({
    trigger_id: triggerId,
    view,
  });
}

function registerHandlers(app, config) {
  app.shortcut('post_job_shortcut', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await openModal(client, body.trigger_id, buildJobModal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.shortcut('post_candidate_shortcut', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await openModal(client, body.trigger_id, buildCandidateModal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.command('/rls-jobs-intake', async ({ ack, command, client, logger }) => {
    await ack();

    const requested = (command.text || '').trim().toLowerCase();
    const wantsCandidate = ['candidate', 'profile', 'availability'].some((token) => requested.includes(token));

    try {
      await openModal(client, command.trigger_id, wantsCandidate ? buildCandidateModal() : buildJobModal());
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('job_posting_submit', async ({ ack, body, client, logger, view }) => {
    const values = parseJobSubmission(view.state.values);
    const errors = validateJobSubmission(values);

    if (Object.keys(errors).length > 0) {
      await ack({
        response_action: 'errors',
        errors,
      });
      return;
    }

    await ack();

    const recommendation = recommendChannel(POST_KIND.JOB, values);
    const routedChannelId = mapFocusToChannelId(recommendation.key, config.channelIds);
    const preview = jobPreviewMessage(body.user.id, values, recommendation, routedChannelId);

    try {
      await client.chat.postMessage(preview);
      logger.info(`job_preview_created user=${body.user.id} channel=${CHANNEL_LABELS[recommendation.key] || '#jobs'}`);
    } catch (error) {
      logger.error(error);
    }
  });

  app.view('candidate_profile_submit', async ({ ack, body, client, logger, view }) => {
    const values = parseCandidateSubmission(view.state.values);
    const errors = validateCandidateSubmission(values);

    if (Object.keys(errors).length > 0) {
      await ack({
        response_action: 'errors',
        errors,
      });
      return;
    }

    await ack();

    const recommendation = recommendChannel(POST_KIND.CANDIDATE, values);
    const routedChannelId = mapFocusToChannelId(recommendation.key, config.channelIds);
    const preview = candidatePreviewMessage(body.user.id, values, recommendation, routedChannelId);

    try {
      await client.chat.postMessage(preview);
      logger.info(
        `candidate_preview_created user=${body.user.id} channel=${CHANNEL_LABELS[recommendation.key] || '#jobs'}`,
      );
    } catch (error) {
      logger.error(error);
    }
  });
}

module.exports = { registerHandlers };
