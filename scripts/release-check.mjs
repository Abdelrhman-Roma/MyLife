import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function walk(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(file, predicate));
    else if (predicate(file)) files.push(file);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

function checkJavaScript() {
  for (const file of walk(root, (path) => path.endsWith('.js'))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`JavaScript syntax: ${relative(root, file)}\n${result.stderr || result.stdout}`);
    }
  }
}

function checkJson() {
  for (const file of walk(root, (path) => path.endsWith('.json'))) {
    try {
      JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      fail(`Invalid JSON: ${relative(root, file)} — ${error.message}`);
    }
  }
}

function checkSourceHtml() {
  for (const file of [join(root, 'index.html'), ...walk(join(root, 'pages'), (path) => path.endsWith('.html'))]) {
    const html = readFileSync(file, 'utf8');
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) fail(`Duplicate id "${duplicate}" in ${relative(root, file)}`);
  }
}

function checkBuildOutput() {
  const dist = join(root, 'dist');
  const expected = [
    'index.html', 'manifest.json', 'sw.js', 'offline.html',
    'js/shared.js', 'js/i18n.js', 'locales/en.js',
    'assist/icons/icon-192.png', 'data/quran/quran.json',
  ];
  for (const path of expected) {
    if (!existsSync(join(dist, path))) fail(`Missing production asset: dist/${path}`);
  }

  const pagesDir = join(dist, 'pages');
  const pages = existsSync(pagesDir) ? readdirSync(pagesDir).filter((name) => name.endsWith('.html')) : [];
  if (pages.length !== 12) fail(`Expected 12 built feature pages; found ${pages.length}.`);

  for (const file of [join(dist, 'index.html'), ...pages.map((name) => join(pagesDir, name))]) {
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    if (!html.includes('href="/manifest.json"')) {
      fail(`Production manifest link is missing or invalid: ${relative(root, file)}`);
    }
  }
}

checkJavaScript();
checkJson();
checkSourceHtml();
checkBuildOutput();

if (failures.length) {
  console.error(`Release verification failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Release verification passed: JavaScript syntax, JSON, source HTML IDs, and required production assets.');
