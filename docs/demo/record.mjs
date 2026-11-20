#!/usr/bin/env node
/**
 * Records the Rule of Code README demos as asciicasts (v2), from REAL output.
 *
 *   node record.mjs [workdir]           the refusal demo  → demo.cast
 *   node record.mjs --pass [workdir]    the pass demo     → pass.cast
 *   node check.mjs [--pass]             holds a cast to the recorded output and the CLI
 *
 * Two demos:
 *   refusal  ./fixture (a neutral TypeScript project, "demo-app") copied to
 *            <workdir> and committed once (fixed author and date); an allowlist
 *            run is PARTIAL, the full run FAILS.
 *   pass     this repository itself at tag v<VERSION>, cloned from GitHub with
 *            its full history into <workdir>; the full run PASSES with no waiver.
 *            `ruleofcode` there is the package installed from npm into
 *            ./node_modules (npm ci, pinned with its integrity in
 *            package-lock.json): inside this repository `npx ruleofcode@…` runs
 *            the local project of the same name, not the published package.
 *
 * For each step: `bash -c "<cmd>"` in <workdir>, FORCE_COLOR=1; its stdout is
 * saved byte for byte to <out>/step-N.stdout (and the exit code). The cast is a
 * prompt, the command typed out, then that stdout.
 *
 * The rules (checked by check.mjs):
 *   - The command typed on screen is the exact string bash ran.
 *   - The output is the step's stdout, byte for byte. The one transformation is
 *     the one a terminal's line discipline makes (ONLCR): "\n" is sent as "\r\n".
 *     Nothing is added, removed or reordered.
 *   - Timing is NOT a fact: pauses are chosen so the summary and the verdict can
 *     be read, and the long lists scroll past quickly.
 *
 * To re-record for another version, change VERSION, the pin in package.json and
 * PASS_TAG_COMMIT, run the scripts, and look at the GIFs.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const VERSION = '7.29.1';
/** The commit tag v<VERSION> names; the pass demo refuses to record anything else. */
const PASS_TAG_COMMIT = 'a6a5a6cc4eebb7bbe304bd5732a3f895a9618e7f';
const PASS_REPO = 'https://github.com/Rule-Of-Code/RoC.git';
const TMP = process.platform === 'win32' ? 'd:/tmp' : '/tmp';

export const DEMOS = {
  refusal: {
    work: `${TMP}/demo-app`,
    cast: 'demo.cast',
    out: 'out',
    cols: 100,
    rows: 32,
    steps: [
      { cmd: 'cat allowlist.json', cli: false },
      {
        cmd: `npx --yes ruleofcode@${VERSION} audit --mode=full --only-failures --config allowlist.json`,
        cli: true,
      },
      { cmd: `npx --yes ruleofcode@${VERSION} audit --mode=full --only-failures`, cli: true },
    ],
  },
  pass: {
    work: `${TMP}/roc-self`,
    cast: 'pass.cast',
    out: 'out-pass',
    cols: 100,
    // Tall enough for the last frame to hold the verdict, the warnings line and
    // the whole victory art (53 lines) at once.
    rows: 58,
    steps: [
      { cmd: 'git describe --tags', cli: false },
      { cmd: 'ruleofcode --version', cli: true },
      { cmd: 'ruleofcode audit --mode=full --only-failures', cli: true },
    ],
  },
};

/** `--pass` selects the pass demo; the first other argument is the work directory. */
export function selectDemo(argv) {
  const name = argv.includes('--pass') ? 'pass' : 'refusal';
  const workArg = argv.find((a) => !a.startsWith('--'));
  return { name, ...DEMOS[name], work: workArg ?? DEMOS[name].work };
}

/** A line paused for at most this long is "quick" and may be batched. */
const QUICK = 0.012;
/** At most this many quick lines per frame. */
const CHUNK = 40;

function run(cmd, cwd, extraEnv = {}) {
  const r = spawnSync('bash', ['-c', cmd], {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1', ...extraEnv },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function mustRun(cmd, cwd, env = {}) {
  const r = run(cmd, cwd, env);
  if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`);
  return r.stdout.toString('utf8').trim();
}

function setupRefusal(work) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  cpSync(join(HERE, 'fixture'), work, { recursive: true });
  const env = {
    GIT_AUTHOR_NAME: 'demo',
    GIT_AUTHOR_EMAIL: 'demo@example.com',
    GIT_COMMITTER_NAME: 'demo',
    GIT_COMMITTER_EMAIL: 'demo@example.com',
    GIT_AUTHOR_DATE: '2026-11-19T12:00:00Z',
    GIT_COMMITTER_DATE: '2026-11-19T12:00:00Z',
  };
  for (const cmd of [
    'git init -q',
    'git -c core.autocrlf=false add -A',
    'git -c core.autocrlf=false commit -q -m "feat: add the demo app"',
  ]) {
    mustRun(cmd, work, env);
  }
}

function setupPass(work) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(dirname(work), { recursive: true });
  // Full history: the git laws read it, and a shallow clone would let them pass
  // on one commit.
  mustRun(`git -c core.autocrlf=false clone -q --branch v${VERSION} ${PASS_REPO} "${work}"`, dirname(work));
  const head = mustRun('git rev-parse HEAD', work);
  if (head !== PASS_TAG_COMMIT) throw new Error(`v${VERSION} is ${head}, expected ${PASS_TAG_COMMIT}`);
  const dirty = mustRun('git status --porcelain', work);
  if (dirty) throw new Error(`the clone is not clean:\n${dirty}`);
}

/** Seconds to wait after a printed line, by what the line says. Not a fact. */
function pauseAfter(line) {
  const text = line.replace(/\x1b\[[0-9;]*m/g, '');
  if (/PARTIAL SCAN|COMPLIANCE: (FAILED|PASSED)/.test(text)) return 2.5;
  if (/law\(s\) reported warnings/.test(text)) return 2.5;
  if (/^Execution time:/.test(text)) return 2.5;
  if (/^(Total Laws Checked|  of which count|  Audit Liveness|✓ Passed|✗ Failed|⚠ Warnings)/.test(text)) return 0.35;
  return 0.012;
}

export function cast(steps, outputs, cols, rows) {
  const events = [];
  let t = 0.5;
  const emit = (data, after) => {
    events.push([Number(t.toFixed(3)), 'o', data]);
    t += after;
  };
  steps.forEach((step, i) => {
    emit('\x1b[32m$\x1b[0m ', 0.4);
    for (const ch of step.cmd) emit(ch, 0.025);
    emit('\r\n', 0.6);
    const lines = outputs[i].toString('utf8').split('\n');
    // Lines with no pause of their own are sent in batches of up to CHUNK, so a
    // long list scrolls in a few frames rather than hundreds (a smaller GIF).
    // Bytes and order are untouched: a batch is the same lines, joined.
    let batch = '';
    let inBatch = 0;
    const flush = () => {
      if (batch) emit(batch, 0.2);
      batch = '';
      inBatch = 0;
    };
    lines.forEach((line, j) => {
      const last = j === lines.length - 1;
      if (last && line === '') return;
      const data = last ? line : `${line}\r\n`;
      const pause = pauseAfter(line);
      if (pause <= QUICK) {
        batch += data;
        if (++inBatch >= CHUNK) flush();
        return;
      }
      flush();
      emit(data, pause);
    });
    flush();
    t += 1.2;
  });
  emit('\x1b[32m$\x1b[0m ', 2.5);
  const header = {
    version: 2,
    width: cols,
    height: rows,
    env: { TERM: 'xterm-256color', SHELL: '/bin/bash' },
  };
  return [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))].join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const demo = selectDemo(process.argv.slice(2));
  const env = {};
  if (demo.name === 'pass') {
    setupPass(demo.work);
    env.PATH = `${join(HERE, 'node_modules', '.bin')}${delimiter}${process.env.PATH}`;
  } else {
    setupRefusal(demo.work);
  }
  mkdirSync(join(HERE, demo.out), { recursive: true });
  const outputs = demo.steps.map((step, i) => {
    const r = run(step.cmd, demo.work, env);
    writeFileSync(join(HERE, demo.out, `step-${i + 1}.stdout`), r.stdout);
    writeFileSync(join(HERE, demo.out, `step-${i + 1}.exit`), `${r.status}\n`);
    if (r.stderr.length > 0) writeFileSync(join(HERE, demo.out, `step-${i + 1}.stderr`), r.stderr);
    console.log(`step ${i + 1}: exit ${r.status}, ${r.stdout.length} bytes stdout, ${r.stderr.length} bytes stderr — ${step.cmd}`);
    return r.stdout;
  });
  writeFileSync(join(HERE, demo.cast), cast(demo.steps, outputs, demo.cols, demo.rows));
  console.log(`${demo.cast} written (${demo.cols}x${demo.rows}). Next: node check.mjs${demo.name === 'pass' ? ' --pass' : ''}, then agg (see README.md)`);
}
