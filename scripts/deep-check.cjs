const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', 'dist', 'android', '.git']);
const sourceExts = new Set(['.js', '.jsx', '.cjs', '.mjs']);
const appExts = new Set(['.js', '.jsx']);
let ok = true;

function fail(message) {
  console.error(`❌ ${message}`);
  ok = false;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const files = walk(root);

// 1) Stop private/internal registry leaks before GitHub Actions spends time building.
for (const file of ['package-lock.json', '.npmrc']) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  if (/packages\.applied-caas|artifactory|internal\.api\.openai/i.test(text)) {
    fail(`${file} contains a private/internal registry URL`);
  }
}

// 2) Exact duplicate source/config/docs files. Ignore binary assets because icons can intentionally share pixels.
const hashes = new Map();
for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (!['.js', '.jsx', '.cjs', '.mjs', '.json', '.md', '.yml', '.yaml', '.css', '.html', '.txt'].includes(ext)) continue;
  const data = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const list = hashes.get(hash) || [];
  list.push(file);
  hashes.set(hash, list);
}
for (const list of hashes.values()) {
  if (list.length > 1) fail(`duplicate file content found: ${list.map(rel).join(', ')}`);
}

// 3) Local import graph check for app code.
const srcRoot = path.join(root, 'src');
const appFiles = files.filter((file) => file.startsWith(srcRoot) && appExts.has(path.extname(file)));
const appFileSet = new Set(appFiles.map(rel));
const adjacency = new Map();
const importRe = /(?:import|from)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]|import\(['\"]([^'\"]+)['\"]\)/g;

function resolveLocalImport(owner, spec) {
  const ownerDir = path.dirname(owner);
  const base = path.resolve(ownerDir, spec);
  const candidates = [];
  for (const ext of ['', '.js', '.jsx']) candidates.push(`${base}${ext}`);
  for (const index of ['index.js', 'index.jsx']) candidates.push(path.join(base, index));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return rel(candidate);
  }
  return null;
}

for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const deps = new Set();
  for (const match of text.matchAll(importRe)) {
    const spec = match[1] || match[2];
    if (!spec || !spec.startsWith('.')) continue;
    const ext = path.extname(spec);
    if (ext && !sourceExts.has(ext)) continue;
    const resolved = resolveLocalImport(file, spec);
    if (!resolved) fail(`missing local import in ${rel(file)} → ${spec}`);
    else if (appFileSet.has(resolved)) deps.add(resolved);
  }
  adjacency.set(rel(file), deps);
}

const entry = 'src/main.jsx';
const reachable = new Set([entry]);
const stack = [entry];
while (stack.length) {
  const current = stack.pop();
  for (const next of adjacency.get(current) || []) {
    if (!reachable.has(next)) {
      reachable.add(next);
      stack.push(next);
    }
  }
}
for (const file of [...appFileSet].sort()) {
  if (!reachable.has(file)) fail(`unused app source file: ${file}`);
}

// 4) Common left-over debug code in production app files.
for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\bdebugger\b/.test(text)) fail(`debugger statement found in ${rel(file)}`);
  if (/console\.log\s*\(/.test(text)) fail(`console.log found in ${rel(file)}`);
}

if (!ok) process.exit(1);
console.log(`✅ Deep check passed: ${appFiles.length} app files, no unused JS/JSX files, no exact duplicate text files, no bad registry URLs.`);
