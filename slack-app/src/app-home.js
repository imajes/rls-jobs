const { POST_KIND } = require('./constants');

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true,
  };
}

function headline(posting) {
  if (posting.kind === POST_KIND.JOB) {
    return `${posting.values.roleTitle || 'Role'} at ${posting.values.companyName || 'Company'}`;
  }
  return posting.values.headline || 'Candidate profile';
}

function kindTag(posting) {
  return posting.kind === POST_KIND.JOB ? '💼 Job' : '🧑‍💻 Candidate';
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toISOString().slice(0, 10);
  } catch (_error) {
    return '';
  }
}

function postingSection(posting) {
  const location = posting.values.locationSummary || 'Location TBD';
  const date = formatDate(posting.createdAt);

  const elements = [
    {
      type: 'button',
      action_id: posting.kind === POST_KIND.JOB ? 'job_published_open_details' : 'candidate_published_open_details',
      text: plainText('Open Details'),
      value: posting.id,
    },
  ];

  if (posting.status !== 'archived') {
    elements.push({
      type: 'button',
      action_id: 'published_post_edit',
      text: plainText('Edit'),
      value: posting.id,
    });
    elements.push({
      type: 'button',
      action_id: 'published_post_archive',
      text: plainText('Archive'),
      style: 'danger',
      value: posting.id,
      confirm: {
        title: plainText('Archive this posting?'),
        text: plainText('This will replace the channel card with an archived marker.'),
        confirm: plainText('Archive'),
        deny: plainText('Cancel'),
      },
    });
  }

  if (posting.permalink) {
    elements.push({
      type: 'button',
      text: plainText('Open in Slack'),
      url: posting.permalink,
      action_id: 'home_post_open_slack',
    });
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${headline(posting)}*\n${kindTag(posting)} • ${location} • ${date}`,
      },
    },
    {
      type: 'actions',
      elements,
    },
    {
      type: 'divider',
    },
  ];
}

function buildAppHomeView(postings) {
  const active = postings.filter((posting) => posting.status !== 'archived');
  const archived = postings.filter((posting) => posting.status === 'archived');

  const blocks = [
    {
      type: 'header',
      text: plainText('RLS Job Listings'),
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Welcome to your listings control panel.*\nShare structured opportunities, keep details current, and archive listings cleanly when they close.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Use the buttons below to post something new, or scroll down to manage what you have already published in Slack.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'home_new_job',
          text: plainText('Share a New Job'),
          style: 'primary',
          value: 'home_new_job',
        },
        {
          type: 'button',
          action_id: 'home_new_candidate',
          text: plainText('Share Candidate Availability'),
          value: 'home_new_candidate',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Tip: you can also use `/rls-jobs-intake job` or `/rls-jobs-intake candidate` from any channel.',
        },
      ],
    },
    {
      type: 'context',
      elements: [plainText(`${active.length} active`), plainText(`${archived.length} archived`)],
    },
    {
      type: 'divider',
    },
  ];

  if (!postings.length) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'No listings yet. Create your first post using the buttons above.',
      },
    });
  } else {
    if (active.length) {
      blocks.push({
        type: 'header',
        text: plainText('Active'),
      });
      for (const posting of active.slice(0, 20)) {
        blocks.push(...postingSection(posting));
      }
    }

    if (archived.length) {
      blocks.push({
        type: 'header',
        text: plainText('Archived'),
      });
      for (const posting of archived.slice(0, 20)) {
        blocks.push(...postingSection(posting));
      }
    }
  }

  return {
    type: 'home',
    blocks,
  };
}

module.exports = {
  buildAppHomeView,
};
