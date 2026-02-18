const { CANDIDATE_AVAILABILITY, CHANNEL_FOCUS, EMPLOYMENT_TYPE, POST_KIND, WORK_ARRANGEMENT } = require('./constants');

const CHANNEL_LABELS = {
  [CHANNEL_FOCUS.JOBS]: '#jobs',
  [CHANNEL_FOCUS.ONSITE]: '#onsite-jobs',
  [CHANNEL_FOCUS.REMOTE]: '#remote-jobs',
  [CHANNEL_FOCUS.COFOUNDER]: '#jobs-cofounders',
  [CHANNEL_FOCUS.CONSULTING]: '#jobs-consulting',
};

function textHasAny(text, keywords) {
  const lowered = (text || '').toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword));
}

function inferFromText(values) {
  const combined = [values.roleTitle, values.description, values.headline, values.skills, values.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (textHasAny(combined, ['cofounder', 'founding engineer', 'founding'])) {
    return CHANNEL_FOCUS.COFOUNDER;
  }

  if (textHasAny(combined, ['consulting', 'fractional', 'contract'])) {
    return CHANNEL_FOCUS.CONSULTING;
  }

  return CHANNEL_FOCUS.JOBS;
}

function recommendChannel(kind, values) {
  if (values.channelFocus && values.channelFocus !== CHANNEL_FOCUS.AUTO) {
    return {
      key: values.channelFocus,
      reason: 'poster_override',
    };
  }

  if (kind === POST_KIND.JOB) {
    if (values.employmentType === EMPLOYMENT_TYPE.COFOUNDER) {
      return { key: CHANNEL_FOCUS.COFOUNDER, reason: 'employment_type_cofounder' };
    }

    if ([EMPLOYMENT_TYPE.CONSULTING, EMPLOYMENT_TYPE.CONTRACT].includes(values.employmentType)) {
      return { key: CHANNEL_FOCUS.CONSULTING, reason: 'employment_type_consulting_or_contract' };
    }

    if (values.workArrangement === WORK_ARRANGEMENT.REMOTE) {
      return { key: CHANNEL_FOCUS.REMOTE, reason: 'remote_work_arrangement' };
    }

    if ([WORK_ARRANGEMENT.ONSITE, WORK_ARRANGEMENT.HYBRID].includes(values.workArrangement)) {
      return { key: CHANNEL_FOCUS.ONSITE, reason: 'onsite_or_hybrid_work_arrangement' };
    }

    return { key: inferFromText(values), reason: 'keyword_fallback' };
  }

  if (kind === POST_KIND.CANDIDATE) {
    if (values.availabilityStatus === CANDIDATE_AVAILABILITY.COFOUNDER_ONLY) {
      return { key: CHANNEL_FOCUS.COFOUNDER, reason: 'candidate_cofounder_only' };
    }

    if (values.availabilityStatus === CANDIDATE_AVAILABILITY.CONTRACT_ONLY) {
      return { key: CHANNEL_FOCUS.CONSULTING, reason: 'candidate_contract_only' };
    }

    if (values.workArrangement === WORK_ARRANGEMENT.REMOTE) {
      return { key: CHANNEL_FOCUS.REMOTE, reason: 'candidate_remote_preference' };
    }

    if ([WORK_ARRANGEMENT.ONSITE, WORK_ARRANGEMENT.HYBRID].includes(values.workArrangement)) {
      return { key: CHANNEL_FOCUS.ONSITE, reason: 'candidate_onsite_or_hybrid_preference' };
    }

    return { key: inferFromText(values), reason: 'keyword_fallback' };
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
