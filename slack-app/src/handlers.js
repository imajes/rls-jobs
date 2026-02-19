const { CHANNEL_LABELS, mapFocusToChannelId, recommendChannel } = require('./channel-routing');
const { POST_KIND } = require('./constants');
const { buildCandidateDetailsModal, buildJobDetailsModal } = require('./details-modals');
const {
  buildCandidateGuidedStep1Modal,
  buildCandidateGuidedStep2Modal,
  buildCandidateGuidedStep3Modal,
  buildJobGuidedStep1Modal,
  buildJobGuidedStep2Modal,
  buildJobGuidedStep3Modal,
} = require('./modals');
const { createPreview, getPreview } = require('./preview-store');
const { candidatePreviewMessage, jobPreviewMessage } = require('./preview-messages');
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

async function sendDm(client, userId, text) {
  await client.chat.postMessage({
    channel: userId,
    text,
  });
}

function parseRouteValue(rawValue) {
  const [previewId, channelFocus] = (rawValue || '').split('|');
  return { channelFocus, previewId };
}

function registerHandlers(app, config) {
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

  app.command('/rls-jobs-intake', async ({ ack, command, client, logger }) => {
    await ack();

    const requested = (command.text || '').trim().toLowerCase();
    const wantsCandidate = ['candidate', 'profile', 'availability'].some((token) => requested.includes(token));

    try {
      await openModal(
        client,
        command.trigger_id,
        wantsCandidate ? buildCandidateGuidedStep1Modal() : buildJobGuidedStep1Modal(),
      );
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

    const values = { ...metadata.data, ...stepData };
    await ack();

    const recommendation = recommendChannel(POST_KIND.JOB, values);
    const routedChannelId = mapFocusToChannelId(recommendation.key, config.channelIds);
    const previewId = createPreview(POST_KIND.JOB, values, recommendation, routedChannelId);
    const preview = jobPreviewMessage(body.user.id, values, recommendation, routedChannelId, previewId);

    try {
      await client.chat.postMessage(preview);
      logger.info(`job_preview_created user=${body.user.id} route=${CHANNEL_LABELS[recommendation.key] || '#jobs'}`);
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

    const values = { ...metadata.data, ...stepData };
    await ack();

    const recommendation = recommendChannel(POST_KIND.CANDIDATE, values);
    const routedChannelId = mapFocusToChannelId(recommendation.key, config.channelIds);
    const previewId = createPreview(POST_KIND.CANDIDATE, values, recommendation, routedChannelId);
    const preview = candidatePreviewMessage(body.user.id, values, recommendation, routedChannelId, previewId);

    try {
      await client.chat.postMessage(preview);
      logger.info(
        `candidate_preview_created user=${body.user.id} route=${CHANNEL_LABELS[recommendation.key] || '#jobs'}`,
      );
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
      await openModal(client, body.trigger_id, buildJobDetailsModal(preview.values, previewId));
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
      await openModal(client, body.trigger_id, buildCandidateDetailsModal(preview.values, previewId));
    } catch (error) {
      logger.error(error);
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
    const { channelFocus } = parseRouteValue(body.actions?.[0]?.selected_option?.value);
    const label = CHANNEL_LABELS[channelFocus] || '#jobs';
    await sendDm(client, body.user.id, `Route preference captured: ${label}`);
  });

  app.action('candidate_card_route_channel', async ({ ack, body, client }) => {
    await ack();
    const { channelFocus } = parseRouteValue(body.actions?.[0]?.selected_option?.value);
    const label = CHANNEL_LABELS[channelFocus] || '#jobs';
    await sendDm(client, body.user.id, `Route preference captured: ${label}`);
  });
}

module.exports = { registerHandlers };
