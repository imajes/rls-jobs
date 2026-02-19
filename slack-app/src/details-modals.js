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

function shortenUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 24 ? `${parsed.pathname.slice(0, 21)}...` : parsed.pathname;
    return `${parsed.origin}${path}`;
  } catch (_error) {
    return url;
  }
}

function humanComp(values) {
  const base = values.compensationValue || 'Compensation not listed';
  const components = values.compensationComponents || [];
  if (!components.length) {
    return base;
  }

  return `${base} + ${components.map((component) => component.charAt(0).toUpperCase() + component.slice(1)).join(' + ')}`;
}

function jobLinkSections(values) {
  const links = splitLinks(values.links);
  if (!links.length) {
    return [
      {
        type: 'section',
        text: plainText('No external links were included in this post.'),
      },
    ];
  }

  const sections = [];
  for (const [index, link] of links.slice(0, 4).entries()) {
    const label = index === 0 ? 'Apply Link' : 'Additional Link';
    const buttonLabel = index === 0 ? '🚀 Open Role' : 'Open Link';
    sections.push({
      type: 'section',
      text: plainText(label),
      accessory: {
        type: 'button',
        text: plainText(buttonLabel),
        url: link,
        action_id: `job_details_link_${index + 1}`,
      },
    });
    sections.push({
      type: 'section',
      text: plainText(index === 0 ? link : shortenUrl(link)),
    });
    if (index < Math.min(links.length, 4) - 1) {
      sections.push({
        type: 'divider',
      });
    }
  }

  if (links.length > 4) {
    sections.push({
      type: 'context',
      elements: [
        plainText(
          `+${links.length - 4} more link${links.length - 4 === 1 ? '' : 's'} were included in the original post.`,
        ),
      ],
    });
  }

  return sections;
}

function candidateLinkSections(values) {
  const links = splitLinks(values.links);
  if (!links.length) {
    return [
      {
        type: 'section',
        text: plainText('No external links were included in this profile.'),
      },
    ];
  }

  const sections = [];
  for (const [index, link] of links.slice(0, 4).entries()) {
    const label = index === 0 ? 'Primary Link' : 'Additional Link';
    sections.push({
      type: 'section',
      text: plainText(label),
      accessory: {
        type: 'button',
        text: plainText('Open Link'),
        url: link,
        action_id: `candidate_details_link_${index + 1}`,
      },
    });
    sections.push({
      type: 'section',
      text: plainText(shortenUrl(link)),
    });
    if (index < Math.min(links.length, 4) - 1) {
      sections.push({
        type: 'divider',
      });
    }
  }

  if (links.length > 4) {
    sections.push({
      type: 'context',
      elements: [
        plainText(
          `+${links.length - 4} more link${links.length - 4 === 1 ? '' : 's'} were included in the original post.`,
        ),
      ],
    });
  }

  return sections;
}

function profileHighlights(values) {
  const rawSkills = (values.skills || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!rawSkills.length) {
    return [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: 'No specific skills were listed.',
          },
        ],
      },
    ];
  }

  return rawSkills.slice(0, 5).map((skill) => ({
    type: 'rich_text_section',
    elements: [
      {
        type: 'text',
        text: skill,
      },
    ],
  }));
}

function buildJobDetailsModal(values) {
  const arrangementText = toLabelList(values.workArrangements, labels.workArrangement) || 'Not specified';
  const employmentText = toLabelList(values.employmentTypes, labels.employmentType) || 'Not specified';
  const roleTitle = values.roleTitle || 'Role';
  const companyName = values.companyName || 'Company';
  const contextPrefix = values.posterUserId
    ? [
        {
          type: 'user',
          user_id: values.posterUserId,
        },
        {
          type: 'text',
          text: ' added this about the role: ',
          style: {
            italic: true,
          },
        },
      ]
    : [
        {
          type: 'text',
          text: 'Additional context from the poster:',
          style: {
            italic: true,
          },
        },
      ];

  const blocks = [
    {
      type: 'header',
      text: plainText(`${roleTitle} at ${companyName}`),
    },
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: plainText('Key Info'),
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          border: 1,
          indent: 0,
          style: 'bullet',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `📍 ${values.locationSummary || 'Location TBD'}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `💼 ${employmentText}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `💸 ${humanComp(values)}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `🛂 Visa: ${labels.visa[values.visaPolicy] || 'Unknown'}`,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'header',
      text: plainText('Role Highlights'),
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

  blocks.push({
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: '  ',
          },
        ],
      },
      {
        type: 'rich_text_section',
        elements: contextPrefix,
      },
      {
        type: 'rich_text_quote',
        elements: [
          {
            type: 'text',
            text: values.summary || 'No additional summary provided.',
          },
        ],
      },
    ],
  });

  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'header',
    text: plainText('More Info & How to Apply'),
  });

  blocks.push(...jobLinkSections(values));

  return {
    type: 'modal',
    callback_id: 'job_full_details_modal',
    title: plainText('Opportunity Details'),
    close: plainText('Close'),
    blocks,
  };
}

function buildCandidateDetailsModal(values) {
  const arrangementText = toLabelList(values.workArrangements, labels.workArrangement) || 'Not specified';
  const availabilityText = toLabelList(values.availabilityModes, labels.candidateAvailability) || 'Not specified';
  const engagementText = toLabelList(values.engagementTypes, labels.employmentType) || 'Not specified';
  const contextPrefix = values.posterUserId
    ? [
        {
          type: 'user',
          user_id: values.posterUserId,
        },
        {
          type: 'text',
          text: ' shared this candidate context: ',
          style: {
            italic: true,
          },
        },
      ]
    : [
        {
          type: 'text',
          text: 'Additional context from the candidate:',
          style: {
            italic: true,
          },
        },
      ];

  const blocks = [
    {
      type: 'header',
      text: plainText(values.headline || 'Candidate profile'),
    },
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: plainText('Quick Snapshot'),
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          border: 1,
          indent: 0,
          style: 'bullet',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `📍 ${values.locationSummary || 'Location TBD'}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `💼 ${engagementText}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `🕒 ${availabilityText}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `💸 ${humanComp(values)}`,
                },
              ],
            },
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: `🛂 Work authorization: ${labels.visa[values.visaPolicy] || 'Unknown'}`,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'header',
      text: plainText('Focus Areas'),
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
                  text: `Preferred work setup: ${arrangementText}`,
                },
              ],
            },
            ...profileHighlights(values),
          ],
        },
      ],
    },
  ];

  blocks.push({
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: '  ',
          },
        ],
      },
      {
        type: 'rich_text_section',
        elements: contextPrefix,
      },
      {
        type: 'rich_text_quote',
        elements: [
          {
            type: 'text',
            text: values.notes || 'No additional candidate notes were included.',
          },
        ],
      },
    ],
  });

  blocks.push({
    type: 'divider',
  });
  blocks.push({
    type: 'header',
    text: plainText('Portfolio & Contact Links'),
  });
  blocks.push(...candidateLinkSections(values));

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
