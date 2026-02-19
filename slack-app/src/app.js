const { App, LogLevel } = require('@slack/bolt');
const { config: loadDotenv } = require('dotenv');

const {
  getConfig,
  getMissingRecommendedAuthEnv,
  getMissingRecommendedPublishEnv,
  getMissingRequiredEnv,
} = require('./config');
const { registerHandlers } = require('./handlers');

loadDotenv();

function parseLogLevel(value) {
  const levels = {
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
  };

  return levels[(value || 'INFO').toUpperCase()] || LogLevel.INFO;
}

function buildApp() {
  const config = getConfig();
  const missingRequired = getMissingRequiredEnv();
  if (missingRequired.length) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  const app = new App({
    token: config.botToken,
    socketMode: true,
    appToken: config.appToken,
    logLevel: parseLogLevel(config.logLevel),
  });

  registerHandlers(app, config);

  return app;
}

async function start() {
  const app = buildApp();
  try {
    await app.start();
    app.logger.info('RLS jobs Bolt app is running');

    const missingRecommended = getMissingRecommendedPublishEnv();
    if (missingRecommended.length) {
      app.logger.warn(`Missing recommended channel config for publish routes: ${missingRecommended.join(', ')}`);
    }

    const missingAuthRecommended = getMissingRecommendedAuthEnv();
    if (missingAuthRecommended.length) {
      app.logger.warn(`Missing recommended auth-link config: ${missingAuthRecommended.join(', ')}`);
    }

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, async () => {
        app.logger.info(`Received ${signal}. Stopping app...`);
        try {
          if (app.__rlsOutbox && typeof app.__rlsOutbox.stop === 'function') {
            app.__rlsOutbox.stop();
          }
          await app.stop();
          process.exit(0);
        } catch (error) {
          app.logger.error('Failed to stop app cleanly', error);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    // App logger may not be available if buildApp threw before creation.
    console.error('Failed to start app', error);
    process.exitCode = 1;
  }
}

module.exports = {
  buildApp,
  start,
};
