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

module.exports = {
  createAuthLink,
  postIntakeEvent,
};
