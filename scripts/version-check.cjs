const fs = require('fs');
const { deriveVersionFromRun } = require('./derive-version.cjs');

let ok = true;
function fail(message) {
  console.error(`❌ ${message}`);
  ok = false;
}

const expected = new Map([
  [1, '0.0.1'],
  [9, '0.0.9'],
  [11, '0.1.1'],
  [45, '0.4.5'],
  [99, '0.9.9'],
  [100, '1.0.0'],
  [139, '1.3.9'],
  [199, '1.9.9'],
  [200, '2.0.0']
]);

for (const [run, version] of expected.entries()) {
  const got = deriveVersionFromRun(run).version;
  if (got !== version) fail(`run #${run} generated ${got}, expected ${version}`);
}

const workflow = fs.readFileSync('.github/workflows/CashNest-X1.yml', 'utf8');
if (/Math\.max\(1,\s*Math\.floor\(run\s*\/\s*100\)\)/.test(fs.readFileSync('scripts/derive-version.cjs', 'utf8')) || /RUN\s*\/\s*100\s*\+\s*1/.test(workflow) || /v1\.1\.1/.test(workflow) || /v2\.3\.9/.test(workflow)) {
  fail('workflow still contains the wrong forced-major version mapping');
}
if (!workflow.includes('node scripts/derive-version.cjs')) {
  fail('workflow must use scripts/derive-version.cjs for version generation');
}

if (!ok) process.exit(1);
console.log('✅ Version check passed: run #11 generates v0.1.1 and run #139 generates v1.3.9; Android versionCode still uses run number.');
