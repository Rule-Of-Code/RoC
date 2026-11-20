#!/usr/bin/env node
/**
 * Holds a demo cast to the facts. Exits 1 on any mismatch.
 *
 *   node check.mjs [projectdir]          the refusal demo (demo.cast, out/)
 *   node check.mjs --pass [projectdir]   the pass demo    (pass.cast, out-pass/)
 *
 *   0. The installed ruleofcode is the published package: the version the demo
 *      runs, resolved from the registry, with the integrity npm reports for it.
 *   1. Each command typed on screen is exactly the command record.mjs ran.
 *   2. What follows it is exactly that step's recorded stdout (<out>/step-N.stdout),
 *      with "\n" sent as "\r\n" (a terminal's ONLCR) and nothing else changed.
 *   3. Every line a ruleofcode step printed exists, as literal text, in the
 *      installed ruleofcode's dist (the capture gate the Rule of Code site uses):
 *      numbers, 'quoted' values, parentheses, laws.* paths and the project path
 *      are cut out as the places the CLI fills in at run time; every fragment of
 *      four or more characters that is left must be a substring of the dist.
 *   4. A line with no words (a rule of '═', the victory art) has nothing for 3
 *      to check, so it is held separately: a single repeated character must be
 *      a `'<c>'.repeat(` in the dist, and a run of picture lines must appear,
 *      character for character and in order, inside one template literal of it.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, selectDemo } from './record.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const demo = selectDemo(process.argv.slice(2));
const STEPS = demo.steps;
const require_ = (p) => JSON.parse(readFileSync(p, 'utf8'));
const pkg = require_(join(HERE, 'node_modules/ruleofcode/package.json'));
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`✗ ${msg}`);
};

// --- 0: the published package ------------------------------------------------
if (pkg.version !== VERSION) fail(`installed ruleofcode is ${pkg.version}, the demo runs ${VERSION}`);
const locked = require_(join(HERE, 'package-lock.json')).packages?.['node_modules/ruleofcode'] ?? {};
const view = spawnSync('npm', ['view', `ruleofcode@${VERSION}`, 'dist.integrity', 'dist.shasum', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
let published = {};
try {
  published = JSON.parse(view.stdout);
} catch {
  /* reported below */
}
const tarball = `https://registry.npmjs.org/ruleofcode/-/ruleofcode-${VERSION}.tgz`;
if (locked.version !== VERSION || locked.resolved !== tarball) {
  fail(`package-lock.json pins ruleofcode ${locked.version} from ${locked.resolved}, not ${VERSION} from the registry`);
} else if (!published['dist.integrity']) {
  fail(`npm view ruleofcode@${VERSION} gave no integrity (exit ${view.status}): the package cannot be checked`);
} else if (locked.integrity !== published['dist.integrity']) {
  fail(`package-lock.json integrity ${locked.integrity} is not the published ${published['dist.integrity']}`);
} else {
  console.log(`✓ ruleofcode ${VERSION} is the published package (integrity ${locked.integrity.slice(0, 19)}…, shasum ${published['dist.shasum']})`);
}

// --- 1 + 2: the cast against the recorded stdout -------------------------------
const [, ...events] = readFileSync(join(HERE, demo.cast), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
const stream = events.map((e) => e[2]).join('');
const PROMPT = '\x1b[32m$\x1b[0m ';
const parts = stream.split(PROMPT).slice(1); // one per step, plus the final empty prompt
if (parts.length !== STEPS.length + 1 || parts[STEPS.length] !== '') {
  fail(`expected ${STEPS.length} prompts and a final empty one, found ${parts.length}`);
}
STEPS.forEach((step, i) => {
  const part = parts[i] ?? '';
  const nl = part.indexOf('\r\n');
  const typed = part.slice(0, nl);
  const shown = part.slice(nl + 2);
  if (typed !== step.cmd) fail(`step ${i + 1}: typed "${typed}" but ran "${step.cmd}"`);
  const stdout = readFileSync(join(HERE, demo.out, `step-${i + 1}.stdout`), 'utf8');
  const expected = stdout.replace(/\n/g, '\r\n');
  if (shown !== expected) fail(`step ${i + 1}: the cast's output is not the recorded stdout byte for byte`);
  else console.log(`✓ step ${i + 1}: typed command = run command; output = recorded stdout (${Buffer.byteLength(stdout)} bytes)`);
});

// --- 3: every CLI line exists in the CLI ---------------------------------------
const DIST_DIR = join(HERE, 'node_modules/ruleofcode/dist');
const DIST_FILES = readdirSync(DIST_DIR, { recursive: true })
  .filter((f) => String(f).endsWith('.js'))
  .map((f) => readFileSync(join(DIST_DIR, String(f)), 'utf8'));
// The text of the literals as the program sees it: \" in the source is " on screen.
const unescape = (s) => s.replace(/\\[nrt]/g, ' ').replace(/\\(["'`\\$])/g, '$1');
const DIST = unescape(DIST_FILES.join('\n'));

/** The project path the steps ran in (record.mjs work dir), as the CLI prints it. */
const PROJECT_DIR = process.platform === 'win32' ? demo.work.replace(/\//g, '\\') : demo.work;

/**
 * A path to a file of the audited project (src/a/b.ts, tests/x.test.ts,
 * d:/tmp/roc-self/src/c.ts): data the CLI reports, not text it contains.
 */
const PROJECT_FILE = /(?:[A-Za-z]:)?(?:[\w.@-]+[\\/])+[\w.@-]+\.[A-Za-z]{1,5}\b/g;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The working directory, with either slash, and any path under it (d:/tmp/roc-self/.git/hooks). */
const PROJECT_PATH = new RegExp(
  `(?:${escapeRe(PROJECT_DIR)}|${escapeRe(PROJECT_DIR.replace(/\\/g, '/'))})[\\w.@\\\\/-]*`,
  'gi'
);

/** The places the CLI fills in at run time, cut out before searching. */
function fragments(line) {
  return line
    .replace(PROJECT_PATH, ' ') // the working directory, which the CLI prints
    .replace(PROJECT_FILE, ' ')
    .replace(/^\s*[•–]\s*/, '')
    // 'single' and "double" quoted values are the project's (a test's title).
    .split(/'[^']*'|"[^"]*"|\d+(?:\.\d+)*|[()]|\blaws\.\w+:?/)
    .map((part) => part.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
    .filter((part) => part.length >= 4);
}

/**
 * The dist's template literals as patterns: `Missing ${tool} for ${purpose}`
 * becomes ^Missing (.+?) for (.+?)$. A segment the CLI built from a template is
 * accepted only if it matches one WHOLE and every hole's content passes this
 * same gate in turn (its fragments are in the dist, or it is itself a template
 * instance) — so `Fix: ${d}` accepts "Fix: Missing lock file (…)" because the
 * text in the hole is a literal in the dist, and `${a}: ${b}` cannot smuggle
 * invented text through. Templates are read file by file: the dist has files
 * with an odd number of backticks, which shift the pairing across a join.
 */
const TEMPLATES = [];
/** Every template literal's raw text, holes included, for the picture check (4). */
const RAW_TEMPLATES = [];
/** A pattern from a template's static parts: each hole becomes a lazy group. */
function addTemplate(statics) {
  if (statics.length < 2) return;
  // Leading indentation and a leading symbol are cut from the segment (clean),
  // so they are cut from the template's first static part the same way.
  statics[0] = statics[0].replace(/^[^A-Za-z(]+/, '');
  if (statics.join('').replace(/[^A-Za-z]/g, '').length < 3) return;
  try {
    TEMPLATES.push(new RegExp(`^${statics.map(escapeRe).join('(.+?)')}$`, 's'));
  } catch {
    /* a template the simple escaper cannot express is skipped, never trusted */
  }
}
for (const file of DIST_FILES) {
  // `a ${x} ` + `b ${y}` is one message written on two lines: join the parts.
  const joined = file.replace(/`\s*\+\s*`/g, '');
  for (const m of joined.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) {
    RAW_TEMPLATES.push(m[1]);
    addTemplate(m[1].split(/\$\{(?:[^{}]|\{[^{}]*\})*\}/).map(unescape));
  }
  // '{filePath}: Weak encryption algorithm detected: {algorithm}' — messages
  // kept as data and filled in later: the same pattern, with {name} as a hole.
  for (const m of file.matchAll(/'((?:[^'\\\n]|\\.)*\{\w+\}(?:[^'\\\n]|\\.)*)'/g)) {
    addTemplate(m[1].split(/\{\w+\}/).map(unescape));
  }
}
const clean = (s) => s.replace(/^[^A-Za-z(]+/, '').replace(/\s+$/, '');
/**
 * A name from the audited code, as a hole holds it: RuleOfCodeAuditor.audit,
 * this.executeLawChecks(…). One token, no spaces — prose in a hole is still
 * held to the dist.
 */
const CODE_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\((?:…|\.\.\.)?\))?$/;
function passes(text, depth = 0) {
  if (depth > 0 && CODE_NAME.test(text)) return true;
  if (fragments(text).every((f) => DIST.includes(f))) return true;
  if (depth >= 3) return false;
  const s = clean(text);
  if (!s) return false;
  return TEMPLATES.some((re) => {
    const m = s.match(re);
    // A hole filled by list.join(', ') is checked item by item.
    return (
      m &&
      m
        .slice(1)
        .every(
          (hole) =>
            passes(hole, depth + 1) ||
            (hole.includes(', ') && hole.split(', ').every((item) => passes(item, depth + 1)))
        )
    );
  });
}

// --- 4: lines with no words ------------------------------------------------------
const ANSI = /\x1b\[[0-9;]*m/g;
/**
 * A line the word gate (3) has nothing to hold: no fragment of four letters, no
 * digit (a run-time number), long enough to be a picture. The victory art draws
 * with x, X and "Xx", so "no letter at all" would let those lines through the
 * word gate unchecked.
 */
const isPicture = (plain) => plain.trim().length >= 3 && !/\d/.test(plain) && fragments(plain).length === 0;
/** '═'.repeat(60): one character, repeated — built at run time by .repeat(). */
function repeatedChar(plain) {
  const chars = Array.from(plain.trim());
  return chars.every((c) => c === chars[0]) ? chars[0] : null;
}
const repeatInDist = (c) => [`'${c}'.repeat(`, `"${c}".repeat(`, `\`${c}\`.repeat(`].some((s) => DIST.includes(s));
/** A run of consecutive picture lines must sit, in order, inside one template literal. */
const blockInDist = (lines) => {
  const block = lines.join('\n');
  return RAW_TEMPLATES.some((t) => t.includes(block));
};
/** The picture lines of `plainLines` that the dist does not contain, as messages. */
function unprintedPictures(plainLines) {
  const missing = [];
  let block = [];
  const flush = () => {
    if (block.length && !blockInDist(block)) missing.push(`a ${block.length}-line picture starting "${block[0].trim()}"`);
    block = [];
  };
  for (const plain of plainLines) {
    if (!isPicture(plain)) {
      flush();
      continue;
    }
    const c = repeatedChar(plain);
    if (c !== null) {
      flush();
      if (!repeatInDist(c)) missing.push(`a rule of '${c}' that no .repeat() in the dist prints`);
      continue;
    }
    block.push(plain);
  }
  flush();
  return missing;
}

STEPS.forEach((step, i) => {
  if (!step.cli) return;
  const raw = readFileSync(join(HERE, demo.out, `step-${i + 1}.stdout`), 'utf8');
  const missing = [];
  const plainLines = raw.split('\n').map((line) => line.replace(ANSI, ''));
  raw.split('\n').forEach((line, j) => {
    if (isPicture(plainLines[j])) return; // held by check 4
    // A change of colour is a seam: each colour is its own chalk call, so two
    // colours on one line are two strings in the CLI's code.
    for (const segment of line.split(ANSI)) {
      if (!passes(segment)) missing.push(segment.trim());
    }
  });
  missing.push(...unprintedPictures(plainLines));
  if (missing.length) fail(`step ${i + 1}: ${missing.length} fragment(s) not in ruleofcode ${pkg.version} dist:\n    ${[...new Set(missing)].join('\n    ')}`);
  else console.log(`✓ step ${i + 1}: every printed line is in ruleofcode ${pkg.version}'s dist`);
});

// Self-tests: the gate must reject invented text, also inside a real template's hole.
for (const invented of [
  '✅ Gate armed and ready',
  'Fix: Gate armed and ready',
  'Sample hooks not configured: armed and ready to ship',
  // inside a {name} message, and inside a message joined from `…` + `…`
  'src/a.ts: Environment variable armed and ready to ship used without fallback',
  'Hooks committed in .husky/ but not installed in this checkout: armed and ready to ship',
  // a code name in a hole is data, but prose in the same hole is not
  'src/a.ts:1: armed and ready checks Cache (line 2) and stores into it only after awaiting f() (line 3) — concurrent callers all miss and all run the fetch; store the in-flight future/promise before the await (single-flight), and drop it on failure',
]) {
  if (passes(invented)) fail(`the gate accepted an invented line: "${invented}"`);
  else console.log(`✓ the gate rejects an invented line: "${invented}"`);
}
// ...and invented pictures: the word gate has nothing to hold them to.
const ART = RAW_TEMPLATES.find((t) => t.includes(':+++++++++.'));
const artLines = (ART ?? '').split('\n').filter(isPicture);
const real = artLines.slice(10, 13);
const tampered = [real[0], real[1]?.replace(/;/, '+'), real[2]];
for (const [label, lines, accept] of [
  ['three real lines of the victory art', real, true],
  ['the same lines with one character changed', tampered, false],
  ['an invented picture line', ['        ::;;++xX++;;::        ;;++::'], false],
  ['an invented rule of ☃', ['☃'.repeat(60)], false],
]) {
  const ok = artLines.length > 0 && unprintedPictures(lines).length === 0;
  if (ok !== accept) fail(`the picture check ${accept ? 'rejected' : 'accepted'} ${label}`);
  else console.log(`✓ the picture check ${accept ? 'accepts' : 'rejects'} ${label}`);
}

process.exit(failures ? 1 : 0);
