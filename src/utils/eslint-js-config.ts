/**
 * An ESLint JavaScript config (`eslint.config.js` / `.mjs`), loaded the way
 * ESLint loads it — by importing it — and reduced to its rules (#613).
 *
 * The rules used to be taken from the file's text with a regular expression,
 * which missed a rule with options (`'complexity': ['error', 10]`) and an
 * unquoted key (`complexity: 'error'`). A config that cannot be loaded is now
 * said not to be read, never guessed from its text.
 *
 * Loading a config runs the project's code, so it never runs in the audit's
 * process: a child Node process imports it, with a time limit. A config that
 * loops, calls `process.exit(0)` or prints to stdout cannot hang the audit,
 * end it with a passing exit code or break its `--json` output. The child
 * writes its answer to a file of its own, so what the config prints does not
 * matter. One answer per config file (path, size and time of change) for the
 * whole process: the three laws that read the rules start one child, not
 * three.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { spawnSync } from './child-process';

/** How long the child may take to import a config and its plugins. */
export const ESLINT_CONFIG_LOAD_TIMEOUT_MS = 20_000;

/** The rules, or why the config was not read. */
export type ESLintJsConfigLoad =
  | { config: { rules: Record<string, unknown> }; reason?: undefined }
  | { config?: undefined; reason: string };

/**
 * The child: imports the config by file URL, awaits a promised default,
 * merges the rules of every config object (nested arrays flattened, later
 * objects over earlier ones) and writes `{ rules }` — or `{ error }` — to the
 * file named by its second argument, then exits without waiting for timers
 * the config may have left.
 */
const IMPORT_SCRIPT = `
const fs = require('fs');
const { pathToFileURL } = require('url');
const [config, out] = process.argv.slice(1);
const write = value => fs.writeFileSync(out, JSON.stringify(value));
import(pathToFileURL(config).href)
  .then(async mod => {
    let exported = await (mod.default ?? mod);
    // A CommonJS file compiled from ESM: exports.default = [...]
    if (exported && !Array.isArray(exported) && !exported.rules && exported.default) {
      exported = await exported.default;
    }
    const rules = {};
    for (const item of [exported].flat(Infinity)) {
      if (item && typeof item === 'object' && item.rules && typeof item.rules === 'object') {
        Object.assign(rules, item.rules);
      }
    }
    write({ rules });
    process.exit(0);
  })
  .catch(error => {
    write({ error: String((error && error.message) || error).split('\\n')[0].slice(0, 200) });
    process.exit(1);
  });
`;

const answers = new Map<string, ESLintJsConfigLoad>();

/** The cache key: the same path changed on disk is a new config. */
function keyOf(configPath: string): string {
  try {
    const stat = fs.statSync(configPath);
    return `${configPath}|${stat.size}|${stat.mtimeMs}`;
  } catch {
    return configPath;
  }
}

/** Read the child's answer file; why it says nothing usable otherwise. */
function answerOf(out: string, exitCode: number | null): ESLintJsConfigLoad {
  let text: string;
  try {
    text = fs.readFileSync(out, 'utf8');
  } catch {
    return {
      reason: `it exited (code ${exitCode ?? 'none'}) before its rules were read`,
    };
  }
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    return { reason: 'its loader wrote no readable answer' };
  }
  const { rules, error } = (answer ?? {}) as {
    rules?: unknown;
    error?: unknown;
  };
  if (typeof error === 'string') return { reason: `it threw: ${error}` };
  return rules && typeof rules === 'object' && !Array.isArray(rules)
    ? { config: { rules: rules as Record<string, unknown> } }
    : { reason: 'its loader wrote no readable answer' };
}

/** Import the config in a child process and read its answer. */
function loadInChild(
  configPath: string,
  timeoutMs: number
): ESLintJsConfigLoad {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-eslint-config-'));
  const out = path.join(dir, 'answer.json');
  try {
    const child = spawnSync(
      process.execPath,
      ['-e', IMPORT_SCRIPT, configPath, out],
      {
        cwd: path.dirname(configPath),
        // Nothing the config prints reaches the audit's output.
        stdio: 'ignore',
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        windowsHide: true,
      }
    );
    const error = child.error as NodeJS.ErrnoException | undefined;
    if (error?.code === 'ETIMEDOUT' || child.signal) {
      return {
        reason: `it did not finish loading within ${timeoutMs / 1000} s`,
      };
    }
    if (error) return { reason: `its loader could not start (${error.code})` };
    return answerOf(out, child.status);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The rules of the config at `configPath` as ESLint would load them, or why
 * they were not read. Answered once per config file for the whole process.
 */
export function loadESLintJsConfig(
  configPath: string,
  timeoutMs = ESLINT_CONFIG_LOAD_TIMEOUT_MS
): ESLintJsConfigLoad {
  const key = keyOf(configPath);
  const known = answers.get(key);
  if (known) return known;
  const answer = loadInChild(configPath, timeoutMs);
  answers.set(key, answer);
  return answer;
}

/** Forget the answers (tests). */
export function clearESLintJsConfigCache(): void {
  answers.clear();
}
