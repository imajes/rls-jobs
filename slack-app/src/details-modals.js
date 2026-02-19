const { labels } = require('./constants');
const { splitLinks } = require('./validation');

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function toLabelList(values, labelMap) {
  return (values || []).map((value) => labelMap[value] || value).join(', ');
}

function humanComp(values) {
  const base = values.compensationValue || 'Compensation not listed';
  const components = values.compensationComponents || [];
  if (!components.length) {
    return base;
  }

  return `${base} + ${components.map((component) => component.charAt(0).toUpperCase() + component.slice(1)).join(' + ')}`;
}

function jobLinkSections(values, previewId) {
  const links = splitLinks(values.links);
  if (!links.length) {
    return [];
  }

  const sections = [];
  for (const [index, link] of links.slice(0, 2).entries()) {
    const label = index === 0 ? 'Apply Link' : 'Additional Link';
    const buttonLabel = index === 0 ? 'Open Role' : 'Open Link';
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${label}*`,
      },
      accessory: {
        type: 'button',
        text: plainText(buttonLabel),
        url: link,
        action_id: `job_details_link_${index + 1}`,
      },
    });
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${link}|${link}>`,
      },
    });
  }

  sections.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: 'job_details_quick_apply',
        text: plainText('Quick Apply'),
        style: 'primary',
        value: previewId,
      },
      {
        type: 'button',
        action_id: 'job_details_save',
        text: plainText('Save to My List'),
        value: previewId,
      },
    ],
  });

  return sections;
}

function candidateLinkSections(values, previewId) {
  const links = splitLinks(values.links);
  if (!links.length) {
    return [
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'candidate_details_save',
            text: plainText('Save to My List'),
            value: previewId,
          },
        ],
      },
    ];
  }

  const sections = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Links*',
      },
    },
  ];

  for (const link of links.slice(0, 3)) {
    sections.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${link}|${link}>`,
      },
    });
  }

  sections.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: 'candidate_details_save',
        text: plainText('Save to My List'),
        value: previewId,
      },
    ],
  });

  return sections;
}

function buildJobDetailsModal(values, previewId) {
  const arrangementText = toLabelList(values.workArrangements, labels.workArrangement) || 'Not specified';
  const employmentText = toLabelList(values.employmentTypes, labels.employmentType) || 'Not specified';

  const blocks = [
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
              text: ` at ${values.companyName || 'Company'}`,
            },
          ],
        },
      ],
    },
    {
      type: 'context',
      elements: [
        plainText(`📍 ${values.locationSummary || 'Location TBD'}`),
        plainText(`💼 ${employmentText}`),
        plainText(`💸 ${humanComp(values)}`),
        plainText(`🛂 Visa: ${labels.visa[values.visaPolicy] || 'Unknown'}`),
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Why this role matters*',
      },
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          style: 'bullet',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'Own reliability and platform quality for high-throughput systems.',
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'Shape architecture decisions with product and infrastructure partners.',
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `Work setup: ${arrangementText}`,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  if (values.summary) {
    blocks.push({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_quote',
          elements: [
            {
              type: 'text',
              text: values.summary,
            },
          ],
        },
      ],
    });
  }

  blocks.push({
    type: 'divider',
  });

  blocks.push(...jobLinkSections(values, previewId));

  return {
    type: 'modal',
    callback_id: 'job_full_details_modal',
    title: plainText('Opportunity Details'),
    close: plainText('Close'),
    blocks,
  };
}

function buildCandidateDetailsModal(values, previewId) {
  const arrangementText = toLabelList(values.workArrangements, labels.workArrangement) || 'Not specified';
  const availabilityText = toLabelList(values.availabilityModes, labels.candidateAvailability) || 'Not specified';
  const engagementText = toLabelList(values.engagementTypes, labels.employmentType) || 'Not specified';

  const blocks = [
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
          ],
        },
      ],
    },
    {
      type: 'context',
      elements: [
        plainText(`📍 ${values.locationSummary || 'Location TBD'}`),
        plainText(`💼 ${engagementText}`),
        plainText(`🕒 ${availabilityText}`),
        plainText(`💸 ${humanComp(values)}`),
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          style: 'bullet',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `Work arrangements: ${arrangementText}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `Work authorization: ${labels.visa[values.visaPolicy] || 'Unknown'}`,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  if (values.notes) {
    blocks.push({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_quote',
          elements: [
            {
              type: 'text',
              text: values.notes,
            },
          ],
        },
      ],
    });
  }

  blocks.push({
    type: 'divider',
  });
  blocks.push(...candidateLinkSections(values, previewId));

  return {
    type: 'modal',
    callback_id: 'candidate_full_details_modal',
    title: plainText('Candidate Details'),
    close: plainText('Close'),
    blocks,
  };
}

module.exports = {
  buildCandidateDetailsModal,
  buildJobDetailsModal,
};
