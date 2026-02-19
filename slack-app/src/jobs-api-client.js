async function postIntakeEvent(config, payload, logger) {
  const ingestUrl = config.jobsApi?.ingestUrl;
  if (!ingestUrl) {
    return { sent: false, reason: 'not_configured' };
  }

  const controller = new AbortController();
  const timeoutMs = Number(config.jobsApi?.timeoutMs || 5000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'rls-jobs-slack-app/step-two',
    };

    if (config.jobsApi.token) {
      headers.Authorization = `Bearer ${config.jobsApi.token}`;
    }

    const response = await fetch(ingestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger?.warn?.(`jobs_api_ingest_failed status=${response.status}`);
      return { sent: false, reason: `http_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    logger?.warn?.('jobs_api_ingest_error', error);
    return { sent: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  postIntakeEvent,
};
