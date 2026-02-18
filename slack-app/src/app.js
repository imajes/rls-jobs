const { App, LogLevel } = require('@slack/bolt');
const { config: loadDotenv } = require('dotenv');

const { getConfig } = require('./config');
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
  } catch (error) {
    app.logger.error('Failed to start app', error);
    process.exitCode = 1;
  }
}

module.exports = {
  buildApp,
  start,
};
