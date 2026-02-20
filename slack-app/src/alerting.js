function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function buildSlackAlertBlocks(alert) {
  const contextPairs = Object.entries(alert.context || {});
  const contextText = contextPairs.length
    ? contextPairs.map(([key, value]) => `• ${key}: ${value}`).join('\n')
    : '• none';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${alert.severity.toUpperCase()}* \`${alert.code}\`\n${alert.message}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Service:* ${alert.service}\n*Fingerprint:* \`${alert.fingerprint}\`\n*Detected at:* ${alert.detected_at}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Context*\n${contextText}`,
      },
    },
  ];
}

function createAlerting({ service, logger, enabled = true, webhookUrl = '', minIntervalSeconds = 900 }) {
  const dedupe = new Map();
  const intervalSeconds = parsePositiveInteger(minIntervalSeconds, 900);

  function dedupeKey(code, fingerprint) {
    return `${code}|${fingerprint || 'global'}`;
  }

  function canonicalAlert({ severity, code, message, context = {}, fingerprint = 'global' }) {
    return {
      service,
      severity: severity === 'critical' ? 'critical' : 'warning',
      code,
      message,
      context,
      fingerprint: fingerprint || 'global',
      detected_at: new Date().toISOString(),
    };
  }

  function logAlert(alert) {
    const level = alert.severity === 'critical' ? 'error' : 'warn';
    logger?.[level]?.(`alert_event ${JSON.stringify(alert)}`);
  }

  async function postToWebhook(alert) {
    if (!enabled || !webhookUrl) {
      return { delivered: false, reason: 'disabled' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `[${alert.severity.toUpperCase()}] ${alert.code}: ${alert.message}`,
          blocks: buildSlackAlertBlocks(alert),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logger?.error?.(
          `ALERT_DELIVERY_FAILED ${JSON.stringify({
            service,
            code: alert.code,
            status: response.status,
            fingerprint: alert.fingerprint,
          })}`,
        );
        return { delivered: false, reason: `http_${response.status}` };
      }

      return { delivered: true, reason: '' };
    } catch (error) {
      logger?.error?.(
        `ALERT_DELIVERY_FAILED ${JSON.stringify({
          service,
          code: alert.code,
          fingerprint: alert.fingerprint,
          error: error?.message || String(error),
        })}`,
      );
      return { delivered: false, reason: 'network_error' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function emit({ severity, code, message, context = {}, fingerprint = 'global' }) {
    const alert = canonicalAlert({ severity, code, message, context, fingerprint });
    logAlert(alert);

    const key = dedupeKey(alert.code, alert.fingerprint);
    const now = Date.now();
    const minIntervalMs = intervalSeconds * 1000;
    const previous = dedupe.get(key);

    if (previous && now - previous < minIntervalMs) {
      return { sent: false, deduped: true, alert };
    }

    dedupe.set(key, now);
    const delivery = await postToWebhook(alert);
    return { sent: delivery.delivered, deduped: false, alert, reason: delivery.reason };
  }

  return {
    emit,
    isEnabled: () => Boolean(enabled),
    minIntervalSeconds: () => intervalSeconds,
  };
}

module.exports = {
  createAlerting,
};
