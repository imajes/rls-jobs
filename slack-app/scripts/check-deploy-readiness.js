const fs = require('node:fs');
const path = require('node:path');
const { config: loadDotenv } = require('dotenv');

const {
  getMissingRecommendedAuthEnv,
  getMissingRecommendedPublishEnv,
  getMissingRequiredEnv,
  RECOMMENDED_AUTH_ENV_VARS,
  RECOMMENDED_PUBLISH_ENV_VARS,
} = require('../src/config');

loadDotenv();

function hasArg(flag) {
  return process.argv.slice(2).includes(flag);
}

function readManifest() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw);
}

function checkManifest(manifest) {
  const failures = [];

  const commandNames = (manifest.features?.slash_commands || []).map((item) => item.command);
  for (const expected of ['/rls-jobs-intake', '/rls-job-intake', '/rls-jobs-auth', '/rls-job-auth']) {
    if (!commandNames.includes(expected)) {
      failures.push(`manifest missing slash command ${expected}`);
    }
  }

  if (!manifest.features?.app_home?.home_tab_enabled) {
    failures.push('manifest app_home.home_tab_enabled should be true');
  }

  const botEvents = manifest.event_subscriptions?.bot_events || [];
  if (!botEvents.includes('app_home_opened')) {
    failures.push('manifest event_subscriptions.bot_events missing app_home_opened');
  }

  const botScopes = manifest.oauth_config?.scopes?.bot || [];
  for (const scope of ['chat:write', 'chat:write.public', 'commands']) {
    if (!botScopes.includes(scope)) {
      failures.push(`manifest oauth bot scope missing ${scope}`);
    }
  }

  return failures;
}

function printChecklist(title, items, okLabel = 'ok') {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`- ${okLabel}`);
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function main() {
  const strict = hasArg('--strict') || hasArg('--go-live');

  const missingRequired = getMissingRequiredEnv();
  const missingRecommended = getMissingRecommendedPublishEnv();
  const missingRecommendedAuth = getMissingRecommendedAuthEnv();
  const manifestFailures = checkManifest(readManifest());

  printChecklist(
    'Required env',
    missingRequired.map((key) => `missing ${key}`),
  );
  printChecklist(
    'Recommended publish env',
    missingRecommended.map((key) => `missing ${key}`),
    `ok (${RECOMMENDED_PUBLISH_ENV_VARS.length}/${RECOMMENDED_PUBLISH_ENV_VARS.length} present)`,
  );
  printChecklist(
    'Recommended auth env',
    missingRecommendedAuth.map((key) => `missing ${key}`),
    `ok (${RECOMMENDED_AUTH_ENV_VARS.length}/${RECOMMENDED_AUTH_ENV_VARS.length} present)`,
  );
  printChecklist('Manifest checks', manifestFailures);

  if (missingRequired.length || manifestFailures.length) {
    console.error('\nDeploy readiness failed.');
    process.exitCode = 1;
    return;
  }

  if (strict && (missingRecommended.length || missingRecommendedAuth.length)) {
    console.error('\nDeploy readiness failed in strict mode: missing recommended publish/auth env.');
    process.exitCode = 1;
    return;
  }

  console.log('\nDeploy readiness check passed.');

  if (!strict && (missingRecommended.length || missingRecommendedAuth.length)) {
    console.log('\nNote: run with --strict for full go-live gating.');
  }
}

main();
