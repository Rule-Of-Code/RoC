#!/usr/bin/env node
/**
 * Public-text guard: no tool attribution in this project's public text.
 *
 * A commit, a pull request, an issue, a comment or a release note of Rule of
 * Code carries no generated-with/by line naming the tool and no Co-Authored-By
 * trailer. The project's text belongs to the project, not to the tool someone
 * wrote it with. Agent tooling adds these lines by default, so a rule that only
 * lives in a document is broken by the next default.
 *
 *   node scripts/public-text-guard.js <file>...       check files (a PR title, a body)
 *   node scripts/public-text-guard.js -               check stdin
 *   node scripts/public-text-guard.js --scan <owner/repo>
 *        check every release, issue, pull request, comment and review comment
 *        through the GitHub API (GITHUB_TOKEN from the environment, if set)
 *
 * Exit 0 when clean; 1 with every hit when not; 2 when the check could not run
 * (no input, an API error) — a check that did not run is not a pass.
 *
 * Plain CommonJS with no dependency on dist/, so CI runs it without a build.
 */

const fs = require('fs');

/** What must not appear. Matched line by line, so a hit names its line. */
const FORBIDDEN = [
  {
    name: 'tool attribution line',
    // the generated-with/by line agent tooling appends, with or without the
    // robot emoji and the markdown link, in any case
    pattern: /Generated (?:with|by)\s*\[?\s*Claude\b/i,
  },
  {
    name: 'Co-Authored-By trailer',
    // at the start of a line, also quoted or indented; the rule written out
    // inline ("no `Co-Authored-By` trailer") is not a trailer
    pattern: /^[\s>]*Co-Authored-By:/i,
  },
];

/** Every forbidden line in `text`, as { line, name, text }. */
function findAttribution(text) {
  const hits = [];
  String(text ?? '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { name, pattern } of FORBIDDEN) {
        if (pattern.test(line))
          hits.push({ line: index + 1, name, text: line.trim() });
      }
    });
  return hits;
}

/** What --scan reads: each endpoint, and the fields of an item that are public text. */
const SCAN = [
  {
    path: 'releases',
    label: x => `release ${x.tag_name}`,
    fields: ['name', 'body'],
  },
  // the issues endpoint lists pull requests too
  {
    path: 'issues?state=all',
    label: x => `#${x.number}`,
    fields: ['title', 'body'],
  },
  { path: 'issues/comments', label: x => x.html_url, fields: ['body'] },
  { path: 'pulls/comments', label: x => x.html_url, fields: ['body'] },
];

/**
 * Every hit in the public text of `repo` ("owner/name"), and how many items
 * were read — a scan that read nothing has checked nothing. Throws when a page
 * cannot be read: a scan that skipped a page has not checked it.
 */
async function scanRepository(
  repo,
  { fetchFn = globalThis.fetch, token = process.env.GITHUB_TOKEN } = {}
) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'public-text-guard',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const hits = [];
  const read = {};
  for (const { path, label, fields } of SCAN) {
    read[path] = 0;
    const sep = path.includes('?') ? '&' : '?';
    for (let page = 1; ; page++) {
      const url = `https://api.github.com/repos/${repo}/${path}${sep}per_page=100&page=${page}`;
      const res = await fetchFn(url, { headers });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const items = await res.json();
      if (!Array.isArray(items)) throw new Error(`${url}: not a list`);
      read[path] += items.length;
      for (const item of items) {
        for (const field of fields) {
          for (const hit of findAttribution(item[field]))
            hits.push({ where: `${label(item)} (${field})`, ...hit });
        }
      }
      if (items.length < 100) break;
    }
  }
  return { hits, read };
}

function report(hits) {
  for (const h of hits)
    console.log(`✗ ${h.where}:${h.line}: ${h.name}: ${h.text}`);
}

async function main(argv) {
  if (argv[0] === '--scan') {
    if (!argv[1]) throw new Error('--scan needs <owner/repo>');
    const { hits, read } = await scanRepository(argv[1]);
    report(hits);
    const counts = Object.entries(read)
      .map(([path, n]) => `${n} ${path.split('?')[0]}`)
      .join(', ');
    if (hits.length === 0)
      console.log(`✓ ${argv[1]}: no tool attribution (read ${counts})`);
    return hits.length ? 1 : 0;
  }
  if (argv.length === 0)
    throw new Error(
      'nothing to check: give files, "-" for stdin, or --scan <owner/repo>'
    );
  const hits = [];
  for (const file of argv) {
    const text =
      file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8');
    for (const hit of findAttribution(text))
      hits.push({ where: file === '-' ? 'stdin' : file, ...hit });
  }
  report(hits);
  if (hits.length === 0)
    console.log(`✓ no tool attribution in ${argv.length} text(s)`);
  return hits.length ? 1 : 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    err => {
      console.error(`✗ the check could not run: ${err.message}`);
      process.exit(2);
    }
  );
}

module.exports = { FORBIDDEN, findAttribution, scanRepository, main };
