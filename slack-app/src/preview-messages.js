const { CHANNEL_LABELS } = require('./channel-routing');

function joinIfPresent(label, value) {
  if (!value) {
    return null;
  }

  return `*${label}:* ${value}`;
}

function jobPreviewMessage(userId, values, recommendation, routedChannelId) {
  const companyName = values.stealthCompany ? 'Stealth' : values.companyName;
  const routingLabel = CHANNEL_LABELS[recommendation.key] || '#jobs';

  const lines = [
    joinIfPresent('Company', companyName),
    joinIfPresent('Role', values.roleTitle),
    joinIfPresent('Employment type', values.employmentType),
    joinIfPresent('Location', values.locationSummary),
    joinIfPresent('Work arrangement', values.workArrangement),
    joinIfPresent('Compensation', values.compensationRange || values.compensationDisclosure),
    joinIfPresent('Visa', values.visaPolicy),
    joinIfPresent('Relationship', values.relationship),
    joinIfPresent('Skills', values.skills),
    joinIfPresent('Link', values.jobUrl),
  ].filter(Boolean);

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Job Post Preview',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: lines.join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Recommended channel: *${routingLabel}* (${recommendation.reason})`,
        },
        {
          type: 'mrkdwn',
          text: routedChannelId
            ? `Channel ID configured: \`${routedChannelId}\``
            : 'No channel ID configured yet for this focus in `.env`.',
        },
      ],
    },
  ];

  if (values.description) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary*\n${values.description}`,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'Step One preview only. Channel posting and API ingestion are wired in Step Two.',
      },
    ],
  });

  return {
    channel: userId,
    text: `Job preview routed to ${routingLabel}`,
    blocks,
  };
}

function candidatePreviewMessage(userId, values, recommendation, routedChannelId) {
  const routingLabel = CHANNEL_LABELS[recommendation.key] || '#jobs';
  const lines = [
    joinIfPresent('Target role(s)', values.headline),
    joinIfPresent('Location', values.locationSummary),
    joinIfPresent('Work preference', values.workArrangement),
    joinIfPresent('Availability', values.availabilityStatus),
    joinIfPresent('Compensation', values.compensationTarget || values.compensationDisclosure),
    joinIfPresent('Visa/work authorization', values.visaPolicy),
    joinIfPresent('Relationship', values.relationship),
    joinIfPresent('Skills', values.skills),
    joinIfPresent('Links', values.links),
  ].filter(Boolean);

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Candidate Post Preview',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: lines.join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Recommended channel: *${routingLabel}* (${recommendation.reason})`,
        },
        {
          type: 'mrkdwn',
          text: routedChannelId
            ? `Channel ID configured: \`${routedChannelId}\``
            : 'No channel ID configured yet for this focus in `.env`.',
        },
      ],
    },
  ];

  if (values.notes) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Notes*\n${values.notes}`,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'Step One preview only. Channel posting and API ingestion are wired in Step Two.',
      },
    ],
  });

  return {
    channel: userId,
    text: `Candidate preview routed to ${routingLabel}`,
    blocks,
  };
}

module.exports = {
  candidatePreviewMessage,
  jobPreviewMessage,
};
