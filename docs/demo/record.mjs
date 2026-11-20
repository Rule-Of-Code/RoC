#!/usr/bin/env node
/**
 * Records the Rule of Code README demo as an asciicast (v2), from REAL output.
 *
 *   node record.mjs [workdir]        then:   agg --cols 100 --rows 32 demo.cast demo.gif
 *   node check.mjs                   holds the cast to the recorded output and the CLI
 *
 * What it does, in order:
 *   1. Copies ./fixture (a neutral TypeScript project, "demo-app") to <workdir>,
 *      makes it a git repository with one commit (fixed author and date).
 *   2. Runs each step below with `bash -c "<cmd>"` in <workdir>, FORCE_COLOR=1,
 *      and saves its stdout byte for byte to out/step-N.stdout (and the exit code).
 *   3. Writes demo.cast: a prompt, the command typed out, then that stdout.
 *
 * The rules (checked by check.mjs):
 *   - The command typed on screen is the exact string bash ran.
 *   - The output is the step's stdout, byte for byte. The one transformation is
 *     the one a terminal's line discipline makes (ONLCR): "\n" is sent as "\r\n".
 *     Nothing is added, removed or reordered.
 *   - Timing is NOT a fact: pauses are chosen so the summary and the verdict can
 *     be read, and the long list of failed laws scrolls past quickly.
 *
 * To re-record for another version, change VERSION and the steps' commands, run
 * both scripts, and look at the GIF.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = '7.29.1';
const WORK =
  process.argv[2] ?? (process.platform === 'win32' ? 'd:/tmp/demo-app' : '/tmp/demo-app');

export const STEPS = [
  { cmd: 'cat allowlist.json', cli: false },
  {
    cmd: `npx --yes ruleofcode@${VERSION} audit --mode=full --only-failures --config allowlist.json`,
    cli: true,
  },
  { cmd: `npx --yes ruleofcode@${VERSION} audit --mode=full --only-failures`, cli: true },
];

export const COLS = 100;
export const ROWS = 32;
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

function setup() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  cpSync(join(HERE, 'fixture'), WORK, { recursive: true });
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
    const r = run(cmd, WORK, env);
    if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`);
  }
}

/** Seconds to wait after a printed line, by what the line says. Not a fact. */
function pauseAfter(line) {
  const text = line.replace(/\x1b\[[0-9;]*m/g, '');
  if (/PARTIAL SCAN|COMPLIANCE: (FAILED|PASSED)/.test(text)) return 2.5;
  if (/^Execution time:/.test(text)) return 2.5;
  if (/^(Total Laws Checked|  of which count|  Audit Liveness|✓ Passed|✗ Failed|⚠ Warnings)/.test(text)) return 0.35;
  return 0.012;
}

function cast(outputs) {
  const events = [];
  let t = 0.5;
  const emit = (data, after) => {
    events.push([Number(t.toFixed(3)), 'o', data]);
    t += after;
  };
  STEPS.forEach((step, i) => {
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
    width: COLS,
    height: ROWS,
    env: { TERM: 'xterm-256color', SHELL: '/bin/bash' },
  };
  return [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))].join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setup();
  mkdirSync(join(HERE, 'out'), { recursive: true });
  const outputs = STEPS.map((step, i) => {
    const r = run(step.cmd, WORK);
    writeFileSync(join(HERE, 'out', `step-${i + 1}.stdout`), r.stdout);
    writeFileSync(join(HERE, 'out', `step-${i + 1}.exit`), `${r.status}\n`);
    if (r.stderr.length > 0) writeFileSync(join(HERE, 'out', `step-${i + 1}.stderr`), r.stderr);
    console.log(`step ${i + 1}: exit ${r.status}, ${r.stdout.length} bytes stdout, ${r.stderr.length} bytes stderr — ${step.cmd}`);
    return r.stdout;
  });
  writeFileSync(join(HERE, 'demo.cast'), cast(outputs));
  console.log(`demo.cast written (${COLS}x${ROWS}). Next: node check.mjs && agg --cols ${COLS} --rows ${ROWS} demo.cast demo.gif`);
}
