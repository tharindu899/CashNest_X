const fs = require('fs');
const { execSync } = require('child_process');

function run(command, fallback = '') {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (error) {
    return fallback;
  }
}

function cleanVersion(value = '') {
  const version = String(value || '')
    .trim()
    .replace(/^refs\/tags\//i, '')
    .replace(/^v/i, '')
    .split('-')[0];
  return version || 'dev';
}

function versionToParts(tag = '') {
  return String(tag || '')
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function compareSemverAsc(a, b) {
  const left = versionToParts(a);
  const right = versionToParts(b);
  const max = Math.max(left.length, right.length, 3);
  for (let index = 0; index < max; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return String(a).localeCompare(String(b));
}

function compareTagsDesc(a, b) {
  return compareSemverAsc(b, a);
}

function getPreviousTag(currentTag) {
  const tags = run('git tag --list "v*"', '')
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => tag !== currentTag);

  const lowerTags = tags
    .filter((tag) => compareSemverAsc(tag, currentTag) < 0)
    .sort(compareTagsDesc);

  if (lowerTags.length) return lowerTags[0];
  return tags.sort(compareTagsDesc)[0] || '';
}

function stripMarkdown(value = '') {
  return String(value || '')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function humanizeSubject(subject = '') {
  let text = stripMarkdown(subject)
    .replace(/^\(?\w+\)?!?:\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/i, '')
    .replace(/^(feat|feature|fix|bugfix|hotfix|change|changed|update|updated|improve|improved|enhance|enhanced|refactor|style|ui|docs|chore|build|ci|release)\s*[-:]\s*/i, '')
    .replace(/^\w+\([^)]*\)!?:\s*/i, '')
    .replace(/^(feat|feature)\s+/i, '')
    .trim();

  text = text.replace(/\s+/g, ' ');
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function classifyCommit(subject = '') {
  const text = String(subject || '').trim();
  const lower = text.toLowerCase();

  if (/^(feat|feature)(\(.+\))?!?:/i.test(text) || /^(feat|feature|add|adds|added|new)\b/i.test(text)) return 'features';
  if (/^(fix|bugfix|hotfix)(\(.+\))?!?:/i.test(text) || /\b(fix|fixed|bug|repair|resolve|resolved|correct)\b/i.test(lower)) return 'bugs';
  if (/^(change|changed|update|updated|improve|improved|enhance|enhanced|refactor|style|ui|perf|build|ci|docs|chore)(\(.+\))?!?:/i.test(text)) return 'changes';
  if (/\b(update|updated|improve|improved|enhance|enhanced|refactor|remove|removed|clean|cleanup|adjust|ui|style|docs|build|workflow)\b/i.test(lower)) return 'changes';

  return 'changes';
}

function isIgnoredCommit(subject = '') {
  const lower = String(subject || '').trim().toLowerCase();
  return (
    !lower ||
    lower.startsWith('merge ') ||
    lower.startsWith('revert ') ||
    /^release\s+v?\d+\.\d+\.\d+/.test(lower) ||
    /^bump\s+version\b/.test(lower) ||
    /^version\s+v?\d+\.\d+\.\d+/.test(lower)
  );
}

function uniquePush(list, item) {
  if (!item) return;
  const key = item.toLowerCase();
  if (!list.some((old) => old.toLowerCase() === key)) list.push(item);
}

function firstLine(value = '') {
  return String(value || '').split('\n')[0].trim();
}

function cleanReleaseLine(line = '') {
  return stripMarkdown(line)
    .replace(/^[\s\-–—*•]+/, '')
    .replace(/^[✨🐞🔧📲✅📝🏷️📦🔁🔗]+\s*/u, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function splitReleaseLine(line = '') {
  const clean = cleanReleaseLine(line);
  if (!clean) return [];

  // Let one commit/body line describe a few details without flooding the release.
  // Example: "fix currency sheet; fix calendar overlay" => two bug bullets.
  return clean
    .split(/\s*(?:;|\|)\s*/g)
    .map((item) => cleanReleaseLine(item))
    .filter(Boolean);
}

function hasExplicitCategory(text = '') {
  const value = String(text || '').trim();
  const lower = value.toLowerCase();
  return (
    /^(feat|feature|add|adds|added|new|fix|bugfix|hotfix|change|changed|update|updated|improve|improved|enhance|enhanced|refactor|style|ui|perf|build|ci|docs|chore)(\(.+\))?!?:/i.test(value) ||
    /^(feat|feature|add|adds|added|new|fix|fixed|bug|repair|resolve|resolved|correct|update|updated|improve|improved|enhance|enhanced|refactor|remove|removed|clean|cleanup|adjust|ui|style|docs|build|workflow)\b/i.test(lower) ||
    /\b(fix|fixed|bug|repair|resolve|resolved|correct)\b/i.test(lower)
  );
}

function releaseItemsFromMessage(message = '') {
  const lines = String(message || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^co-authored-by:/i.test(line))
    .filter((line) => !/^signed-off-by:/i.test(line));

  if (!lines.length) return [];

  const subject = firstLine(lines[0]);
  const fallbackGroup = classifyCommit(subject);
  const items = [];

  // Always include the commit subject.
  splitReleaseLine(subject).forEach((item) => {
    items.push({ text: item, fallbackGroup: null });
  });

  // Also include useful commit-body bullets/details from the current push.
  lines.slice(1).forEach((line) => {
    const looksLikeDetail = /^[-*•]|^\d+[.)]|^[✨🐞🔧]/u.test(line) || hasExplicitCategory(line);
    if (!looksLikeDetail) return;
    splitReleaseLine(line).forEach((item) => {
      items.push({ text: item, fallbackGroup });
    });
  });

  return items;
}

function getCurrentReleaseItems() {
  const messages = [];

  // GitHub push event payload contains only commits included in the current push.
  // This keeps release notes about the current APK version without flooding old history.
  const eventPath = process.env.GITHUB_EVENT_PATH || '';
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      if (Array.isArray(event?.commits) && event.commits.length) {
        event.commits.forEach((commit) => {
          if (commit?.message) messages.push(commit.message);
        });
      }
      if (!messages.length && event?.head_commit?.message) {
        messages.push(event.head_commit.message);
      }
    } catch (error) {
      // Fall back to git log below.
    }
  }

  if (!messages.length) {
    const output = run('git log --no-merges -1 --format=%B HEAD', '');
    if (output) messages.push(output);
  }

  return messages
    .flatMap((message) => releaseItemsFromMessage(message))
    .map((item) => ({
      text: item.text.trim(),
      fallbackGroup: item.fallbackGroup
    }))
    .filter((item) => item.text)
    .filter((item) => !isIgnoredCommit(item.text));
}

function bulletLines(items, emoji, emptyText) {
  if (!items.length) return [`- ${emoji} ${emptyText}`];
  return items.map((item) => `- ${emoji} ${item}`);
}

const version = cleanVersion(process.env.VERSION || process.env.TAG || 'dev');
const versionLabel = version === 'dev' ? 'dev' : `v${version}`;
const apkName = process.env.APK_NAME || (version === 'dev' ? 'CashNest-X-dev.apk' : `CashNest-X-${versionLabel}.apk`);
const repository = process.env.GITHUB_REPOSITORY || '';
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
const runId = process.env.GITHUB_RUN_ID || '';
const runNumber = process.env.GITHUB_RUN_NUMBER || '';
const sha = process.env.GITHUB_SHA || run('git rev-parse HEAD', '');
const shortSha = sha ? sha.slice(0, 7) : 'unknown';
const currentTag = process.env.TAG || versionLabel;
const previousTag = process.env.PREVIOUS_TAG || getPreviousTag(currentTag);

const features = [];
const bugs = [];
const changes = [];

getCurrentReleaseItems().forEach((item) => {
  const clean = humanizeSubject(item.text);
  if (!clean) return;
  let group = classifyCommit(item.text);
  if (!hasExplicitCategory(item.text) && item.fallbackGroup) group = item.fallbackGroup;
  if (group === 'features') uniquePush(features, clean);
  else if (group === 'bugs') uniquePush(bugs, clean);
  else uniquePush(changes, clean);
});

const repoUrl = repository ? `${serverUrl}/${repository}` : '';
const runLink = repoUrl && runId ? `${repoUrl}/actions/runs/${runId}` : '';
const commitLink = repoUrl && sha ? `${repoUrl}/commit/${sha}` : '';
const compareLink = repoUrl && previousTag ? `${repoUrl}/compare/${previousTag}...${currentTag}` : repoUrl ? `${repoUrl}/commits/${currentTag}` : '';

const runText = runNumber && runLink ? `[#${runNumber}](${runLink})` : runNumber ? `#${runNumber}` : 'Local build';
const commitText = commitLink ? `[${shortSha}](${commitLink})` : shortSha;
const compareText = compareLink ? `[View compare](${compareLink})` : 'Not available';

const lines = [
  `# 🪺 CashNest X ${versionLabel}`,
  'Beautiful money manager APK release.',
  '',
  '## ✨ New features',
  ...bulletLines(features, '✨', 'No new feature commits detected in this release.'),
  '',
  '## 🐞 Bug fixes',
  ...bulletLines(bugs, '🐞', 'No bug fix commits detected in this release.'),
  '',
  '## 🔧 Changes',
  ...bulletLines(changes, '🔧', 'No change commits detected in this release.'),
  '',
  '## 📲 Install',
  `1. Download **${apkName}** below.`,
  '2. On Android, allow **Install unknown apps** for your browser/file manager.',
  '3. Open the APK and tap **Install**.',
  '',
  '## ✅ Build info',
  `- 🏷️ Version: **${versionLabel}**`,
  `- 📦 APK: **${apkName}**`,
  `- 🔁 Workflow run: ${runText}`,
  `- 🔗 Commit: ${commitText}`,
  `- 📝 Full changes: ${compareText}`,
  '',
  '*Release notes are generated automatically from commit messages on every release.*',
  ''
];

const body = lines.join('\n');
fs.writeFileSync('RELEASE_NOTES.md', body);
console.log(body);
