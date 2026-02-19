function buildHeaders(config) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'rls-jobs-slack-app/step-six',
  };

  if (config.jobsApi.token) {
    headers.Authorization = `Bearer ${config.jobsApi.token}`;
  }

  return headers;
}

function resolvePostingsUrl(config) {
  if (config.jobsApi?.postingsUrl) {
    return config.jobsApi.postingsUrl;
  }

  const ingestUrl = config.jobsApi?.ingestUrl || '';
  if (!ingestUrl) {
    return '';
  }

  return ingestUrl.replace(/\/intake\/?$/, '/postings');
}

async function getJson(config, url, logger, failurePrefix) {
  const controller = new AbortController();
  const timeoutMs = Number(config.jobsApi?.timeoutMs || 5000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger?.warn?.(`${failurePrefix}_failed status=${response.status}`);
      return { ok: false, reason: `http_${response.status}` };
    }

    const body = await response.json();
    return { ok: true, body };
  } catch (error) {
    logger?.warn?.(`${failurePrefix}_error`, error);
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(config, url, payload, logger, failurePrefix) {
  const controller = new AbortController();
  const timeoutMs = Number(config.jobsApi?.timeoutMs || 5000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger?.warn?.(`${failurePrefix}_failed status=${response.status}`);
      return { ok: false, reason: `http_${response.status}` };
    }

    let body = {};
    try {
      body = await response.json();
    } catch (_error) {
      body = {};
    }

    return { ok: true, body };
  } catch (error) {
    logger?.warn?.(`${failurePrefix}_error`, error);
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

async function postIntakeEvent(config, payload, logger) {
  const ingestUrl = config.jobsApi?.ingestUrl;
  if (!ingestUrl) {
    return { sent: false, reason: 'not_configured' };
  }

  const result = await postJson(config, ingestUrl, payload, logger, 'jobs_api_ingest');
  if (!result.ok) {
    return { sent: false, reason: result.reason };
  }

  return { sent: true, response: result.body };
}

async function createAuthLink(config, payload, logger) {
  const authLinkUrl = config.jobsApi?.authLinkUrl;
  if (!authLinkUrl) {
    return { sent: false, reason: 'not_configured' };
  }

  const result = await postJson(config, authLinkUrl, payload, logger, 'jobs_api_auth_link');
  if (!result.ok) {
    return { sent: false, reason: result.reason };
  }

  const authUrl = result.body?.auth_url || '';
  if (!authUrl) {
    return { sent: false, reason: 'invalid_response' };
  }

  return {
    sent: true,
    authUrl,
    expiresAt: result.body?.expires_at || '',
    ttlSeconds: Number(result.body?.ttl_seconds || 0),
  };
}

function toPostingShape(payload) {
  const moderation = payload.moderation || {};
  const ageValue = moderation.account_age_days ?? moderation.accountAgeDays;
  const accountAgeDays = Number.isFinite(Number(ageValue)) ? Number(ageValue) : null;

  return {
    id: payload.external_posting_id,
    kind: payload.kind,
    status: payload.status,
    values: payload.values || {},
    posterUserId: payload.poster_user_id || '',
    channelId: payload.channel_id || '',
    channelFocus: payload.channel_focus || '',
    messageTs: payload.published_message_ts || '',
    permalink: payload.permalink || '',
    createdAt: Date.parse(payload.created_at || '') || Date.now(),
    updatedAt: Date.parse(payload.updated_at || '') || Date.now(),
    archivedAt: payload.archived_at ? Date.parse(payload.archived_at) : null,
    moderation: {
      enabled: moderation.enabled ?? true,
      flagged: moderation.flagged === true,
      reason: moderation.reason || '',
      accountAgeDays,
      thresholdDays: moderation.threshold_days ?? moderation.thresholdDays ?? null,
      state: moderation.state || '',
    },
  };
}

async function listPostings(config, query, logger) {
  const postingsUrl = resolvePostingsUrl(config);
  if (!postingsUrl || !config.jobsApi?.readEnabled) {
    return { fetched: false, reason: 'not_configured' };
  }

  const qs = new URLSearchParams();
  if (query.posterUserId) {
    qs.set('poster_user_id', query.posterUserId);
  }
  if (query.status) {
    qs.set('status', query.status);
  }
  if (query.limit) {
    qs.set('limit', String(query.limit));
  }

  const url = `${postingsUrl}?${qs.toString()}`;
  const result = await getJson(config, url, logger, 'jobs_api_postings_list');
  if (!result.ok) {
    return { fetched: false, reason: result.reason };
  }

  const postings = Array.isArray(result.body?.postings)
    ? result.body.postings.map((posting) => toPostingShape(posting))
    : [];
  return { fetched: true, postings };
}

async function getPosting(config, externalPostingId, logger) {
  const postingsUrl = resolvePostingsUrl(config);
  if (!postingsUrl || !config.jobsApi?.readEnabled) {
    return { fetched: false, reason: 'not_configured' };
  }

  const url = `${postingsUrl}/${encodeURIComponent(externalPostingId)}`;
  const result = await getJson(config, url, logger, 'jobs_api_postings_get');
  if (!result.ok) {
    return { fetched: false, reason: result.reason };
  }

  const posting = result.body?.posting ? toPostingShape(result.body.posting) : null;
  if (!posting) {
    return { fetched: false, reason: 'invalid_response' };
  }

  return { fetched: true, posting };
}

module.exports = {
  createAuthLink,
  getPosting,
  listPostings,
  postIntakeEvent,
  resolvePostingsUrl,
};
