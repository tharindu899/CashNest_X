const fs = require('fs');

function normalizeRunNumber(value) {
  const run = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(run) && run > 0 ? run : 1;
}

function deriveVersionFromRun(runValue) {
  const run = normalizeRunNumber(runValue);
  const major = Math.floor(run / 100);
  const minor = Math.floor((run % 100) / 10);
  const patch = run % 10;
  const version = `${major}.${minor}.${patch}`;
  const tag = `v${version}`;
  const apkName = `CashNest-X-${tag}.apk`;
  return { run, major, minor, patch, version, tag, apkName };
}

function appendLine(file, key, value) {
  if (!file) return;
  fs.appendFileSync(file, `${key}=${value}\n`);
}

function writeGithubValues(result) {
  appendLine(process.env.GITHUB_ENV, 'VERSION', result.version);
  appendLine(process.env.GITHUB_ENV, 'TAG', result.tag);
  appendLine(process.env.GITHUB_ENV, 'APK_NAME', result.apkName);
  appendLine(process.env.GITHUB_OUTPUT, 'version', result.version);
  appendLine(process.env.GITHUB_OUTPUT, 'tag', result.tag);
  appendLine(process.env.GITHUB_OUTPUT, 'apk_name', result.apkName);
}

if (require.main === module) {
  const result = deriveVersionFromRun(process.env.GITHUB_RUN_NUMBER || process.argv[2]);
  writeGithubValues(result);
  console.log(`✅ Workflow run #${result.run} → app ${result.tag}`);
}

module.exports = { deriveVersionFromRun, normalizeRunNumber };
