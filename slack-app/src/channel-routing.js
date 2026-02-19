const { CANDIDATE_AVAILABILITY, CHANNEL_FOCUS, EMPLOYMENT_TYPE, POST_KIND, WORK_ARRANGEMENT } = require('./constants');

const CHANNEL_LABELS = {
  [CHANNEL_FOCUS.JOBS]: '#jobs',
  [CHANNEL_FOCUS.ONSITE]: '#onsite-jobs',
  [CHANNEL_FOCUS.REMOTE]: '#remote-jobs',
  [CHANNEL_FOCUS.COFOUNDER]: '#jobs-cofounders',
  [CHANNEL_FOCUS.CONSULTING]: '#jobs-consulting',
};

function hasAny(values, expected) {
  return values.some((value) => expected.includes(value));
}

function textHasAny(text, keywords) {
  const lowered = (text || '').toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword));
}

function inferFromText(values) {
  const combined = [values.roleTitle, values.summary, values.headline, values.skills, values.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (textHasAny(combined, ['cofounder', 'founding'])) {
    return CHANNEL_FOCUS.COFOUNDER;
  }

  if (textHasAny(combined, ['consulting', 'fractional', 'contract'])) {
    return CHANNEL_FOCUS.CONSULTING;
  }

  return CHANNEL_FOCUS.JOBS;
}

function recommendChannel(kind, values) {
  if (kind === POST_KIND.JOB) {
    if (hasAny(values.employmentTypes || [], [EMPLOYMENT_TYPE.COFOUNDER])) {
      return { key: CHANNEL_FOCUS.COFOUNDER, reason: 'employment_type_cofounder' };
    }

    if (hasAny(values.employmentTypes || [], [EMPLOYMENT_TYPE.CONSULTING, EMPLOYMENT_TYPE.CONTRACT])) {
      return { key: CHANNEL_FOCUS.CONSULTING, reason: 'employment_type_contract_or_consulting' };
    }

    const workArrangements = values.workArrangements || [];
    const hasRemote = hasAny(workArrangements, [WORK_ARRANGEMENT.REMOTE]);
    const hasOnsite = hasAny(workArrangements, [WORK_ARRANGEMENT.ONSITE, WORK_ARRANGEMENT.HYBRID]);

    if (hasRemote && !hasOnsite) {
      return { key: CHANNEL_FOCUS.REMOTE, reason: 'remote_only' };
    }

    if (hasOnsite && !hasRemote) {
      return { key: CHANNEL_FOCUS.ONSITE, reason: 'onsite_or_hybrid_only' };
    }

    return { key: inferFromText(values), reason: 'keyword_or_mixed_fallback' };
  }

  if (kind === POST_KIND.CANDIDATE) {
    if (hasAny(values.availabilityModes || [], [CANDIDATE_AVAILABILITY.COFOUNDER_ONLY])) {
      return { key: CHANNEL_FOCUS.COFOUNDER, reason: 'candidate_cofounder_only' };
    }

    if (hasAny(values.availabilityModes || [], [CANDIDATE_AVAILABILITY.CONTRACT_ONLY])) {
      return { key: CHANNEL_FOCUS.CONSULTING, reason: 'candidate_contract_only' };
    }

    const workArrangements = values.workArrangements || [];
    const hasRemote = hasAny(workArrangements, [WORK_ARRANGEMENT.REMOTE]);
    const hasOnsite = hasAny(workArrangements, [WORK_ARRANGEMENT.ONSITE, WORK_ARRANGEMENT.HYBRID]);

    if (hasRemote && !hasOnsite) {
      return { key: CHANNEL_FOCUS.REMOTE, reason: 'candidate_remote_only' };
    }

    if (hasOnsite && !hasRemote) {
      return { key: CHANNEL_FOCUS.ONSITE, reason: 'candidate_onsite_or_hybrid_only' };
    }

    return { key: inferFromText(values), reason: 'keyword_or_mixed_fallback' };
  }

  return { key: CHANNEL_FOCUS.JOBS, reason: 'default' };
}

function mapFocusToChannelId(channelFocus, channelIds) {
  const map = {
    [CHANNEL_FOCUS.JOBS]: channelIds.jobs,
    [CHANNEL_FOCUS.ONSITE]: channelIds.onsiteJobs,
    [CHANNEL_FOCUS.REMOTE]: channelIds.remoteJobs,
    [CHANNEL_FOCUS.COFOUNDER]: channelIds.jobsCofounders,
    [CHANNEL_FOCUS.CONSULTING]: channelIds.jobsConsulting,
  };

  return map[channelFocus] || '';
}

module.exports = {
  CHANNEL_LABELS,
  mapFocusToChannelId,
  recommendChannel,
};
