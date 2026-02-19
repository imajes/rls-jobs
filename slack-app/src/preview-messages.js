const { CHANNEL_LABELS } = require('./channel-routing');
const { labels } = require('./constants');
const { splitLinks } = require('./validation');

function toLabelList(values, labelMap) {
  return (values || []).map((value) => labelMap[value] || value);
}

function humanComp(values) {
  const base = values.compensationValue || 'Compensation not listed';
  const components = values.compensationComponents || [];
  if (!components.length) {
    return base;
  }

  return `${base} + ${components.map((component) => component.charAt(0).toUpperCase() + component.slice(1)).join(' + ')}`;
}

function jobHeadline(values) {
  return `${values.roleTitle || 'Role'} at ${values.companyName || 'Company'}, ${values.locationSummary || 'Location TBD'}`;
}

function candidateHeadline(values) {
  return `${values.headline || 'Candidate'}, ${values.locationSummary || 'Location TBD'}`;
}

function firstLink(values) {
  return splitLinks(values.links)[0] || '';
}

function routeOptions(previewId) {
  return Object.entries(CHANNEL_LABELS).map(([key, label]) => ({
    text: {
      type: 'plain_text',
      text: `Send to ${label}`,
      emoji: true,
    },
    value: `${previewId}|${key}`,
  }));
}

function jobPreviewMessage(userId, values, recommendation, routedChannelId, previewId) {
  const employment = toLabelList(values.employmentTypes, labels.employmentType).join(', ') || 'Not specified';
  const visa = labels.visa[values.visaPolicy] || 'Not specified';
  const summary = values.summary || 'No summary provided.';
  const applyLink = firstLink(values);

  const actions = [
    {
      type: 'button',
      action_id: 'job_card_open_details_modal',
      text: {
        type: 'plain_text',
        text: 'Open Details',
        emoji: true,
      },
      style: 'primary',
      value: previewId,
    },
    {
      type: 'button',
      action_id: 'job_card_quick_apply',
      text: {
        type: 'plain_text',
        text: 'Quick Apply',
        emoji: true,
      },
      value: previewId,
    },
    {
      type: 'button',
      action_id: 'job_card_save',
      text: {
        type: 'plain_text',
        text: 'Save',
        emoji: true,
      },
      value: previewId,
    },
    {
      type: 'overflow',
      action_id: 'job_card_route_channel',
      options: routeOptions(previewId),
    },
  ];

  if (!applyLink) {
    actions.splice(1, 1);
  }

  return {
    channel: userId,
    text: jobHeadline(values),
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: values.roleTitle || 'Role',
                style: {
                  bold: true,
                },
              },
              {
                type: 'text',
                text: ` at ${values.companyName || 'Company'}, ${values.locationSummary || 'Location TBD'}`,
              },
            ],
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `💼 ${employment}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: `💸 ${humanComp(values)}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: `🛂 Visa: ${visa}`,
            emoji: true,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: summary,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `Suggested destination: ${CHANNEL_LABELS[recommendation.key] || '#jobs'}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: routedChannelId
              ? `Configured channel ID: ${routedChannelId}`
              : 'No configured channel ID found for this route.',
            emoji: true,
          },
        ],
      },
      {
        type: 'actions',
        elements: actions,
      },
    ],
  };
}

function candidatePreviewMessage(userId, values, recommendation, routedChannelId, previewId) {
  const arrangements = toLabelList(values.workArrangements, labels.workArrangement).join(', ') || 'Not specified';
  const availability =
    toLabelList(values.availabilityModes, labels.candidateAvailability).join(', ') || 'Not specified';
  const summary = values.notes || 'No notes provided.';

  return {
    channel: userId,
    text: candidateHeadline(values),
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: values.headline || 'Candidate profile',
                style: {
                  bold: true,
                },
              },
              {
                type: 'text',
                text: ` • ${values.locationSummary || 'Location TBD'}`,
              },
            ],
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `📌 Work: ${arrangements}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: `🕒 Availability: ${availability}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: `💸 ${humanComp(values)}`,
            emoji: true,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: summary,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `Suggested destination: ${CHANNEL_LABELS[recommendation.key] || '#jobs'}`,
            emoji: true,
          },
          {
            type: 'plain_text',
            text: routedChannelId
              ? `Configured channel ID: ${routedChannelId}`
              : 'No configured channel ID found for this route.',
            emoji: true,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'candidate_card_open_details_modal',
            text: {
              type: 'plain_text',
              text: 'Open Details',
              emoji: true,
            },
            style: 'primary',
            value: previewId,
          },
          {
            type: 'button',
            action_id: 'candidate_card_save',
            text: {
              type: 'plain_text',
              text: 'Save',
              emoji: true,
            },
            value: previewId,
          },
          {
            type: 'overflow',
            action_id: 'candidate_card_route_channel',
            options: routeOptions(previewId),
          },
        ],
      },
    ],
  };
}

module.exports = {
  candidatePreviewMessage,
  jobPreviewMessage,
};
