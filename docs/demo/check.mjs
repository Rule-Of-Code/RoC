#!/usr/bin/env node
/**
 * Holds demo.cast to the facts. Exits 1 on any mismatch.
 *
 *   1. Each command typed on screen is exactly the command record.mjs ran.
 *   2. What follows it is exactly that step's recorded stdout (out/step-N.stdout),
 *      with "\n" sent as "\r\n" (a terminal's ONLCR) and nothing else changed.
 *   3. Every line a ruleofcode step printed exists, as literal text, in the
 *      installed ruleofcode's dist (the capture gate the Rule of Code site uses):
 *      numbers, 'quoted' values, parentheses, laws.* paths and the project path
 *      are cut out as the places the CLI fills in at run time; every fragment of
 *      four or more characters that is left must be a substring of the dist.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS } from './record.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const require_ = (p) => JSON.parse(readFileSync(p, 'utf8'));
const pkg = require_(join(HERE, 'node_modules/ruleofcode/package.json'));
const wanted = STEPS.find((s) => s.cli).cmd.match(/ruleofcode@([\d.]+)/)[1];
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`✗ ${msg}`);
};
if (pkg.version !== wanted) fail(`installed ruleofcode is ${pkg.version}, the demo runs ${wanted}`);

// --- 1 + 2: the cast against the recorded stdout -------------------------------
const [, ...events] = readFileSync(join(HERE, 'demo.cast'), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
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
  const stdout = readFileSync(join(HERE, 'out', `step-${i + 1}.stdout`), 'utf8');
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

/** The project path the steps ran in (record.mjs WORK), as the CLI prints it. */
const PROJECT_DIR = (process.argv[2] ?? (process.platform === 'win32' ? 'd:\\tmp\\demo-app' : '/tmp/demo-app'));

/** The places the CLI fills in at run time, cut out before searching. */
function fragments(line) {
  return line
    .split(PROJECT_DIR).join(' ') // the working directory, which the CLI prints
    .replace(/^\s*[•–]\s*/, '')
    .split(/'[^']*'|\d+(?:\.\d+)*|[()]|\blaws\.\w+:?/)
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
for (const file of DIST_FILES) {
  for (const m of file.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) {
    const statics = m[1].split(/\$\{(?:[^{}]|\{[^{}]*\})*\}/).map(unescape);
    if (statics.length < 2) continue;
    // Leading indentation and a leading symbol are cut from the segment (clean),
    // so they are cut from the template's first static part the same way.
    statics[0] = statics[0].replace(/^[^A-Za-z(]+/, '');
    if (statics.join('').replace(/[^A-Za-z]/g, '').length < 3) continue;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      TEMPLATES.push(new RegExp(`^${statics.map(esc).join('(.+?)')}$`, 's'));
    } catch {
      /* a template the simple escaper cannot express is skipped, never trusted */
    }
  }
}
const clean = (s) => s.replace(/^[^A-Za-z(]+/, '').replace(/\s+$/, '');
function passes(text, depth = 0) {
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

STEPS.forEach((step, i) => {
  if (!step.cli) return;
  const raw = readFileSync(join(HERE, 'out', `step-${i + 1}.stdout`), 'utf8');
  const missing = [];
  for (const line of raw.split('\n')) {
    // A change of colour is a seam: each colour is its own chalk call, so two
    // colours on one line are two strings in the CLI's code.
    for (const segment of line.split(/\x1b\[[0-9;]*m/)) {
      if (!passes(segment)) missing.push(segment.trim());
    }
  }
  if (missing.length) fail(`step ${i + 1}: ${missing.length} fragment(s) not in ruleofcode ${pkg.version} dist:\n    ${[...new Set(missing)].join('\n    ')}`);
  else console.log(`✓ step ${i + 1}: every printed line is in ruleofcode ${pkg.version}'s dist`);
});

// Self-tests: the gate must reject invented text, also inside a real template's hole.
for (const invented of [
  '✅ Gate armed and ready',
  'Fix: Gate armed and ready',
  'Sample hooks not configured: armed and ready to ship',
]) {
  if (passes(invented)) fail(`the gate accepted an invented line: "${invented}"`);
  else console.log(`✓ the gate rejects an invented line: "${invented}"`);
}

process.exit(failures ? 1 : 0);
