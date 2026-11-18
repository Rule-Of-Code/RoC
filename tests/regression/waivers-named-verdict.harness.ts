/**
 * Shared harness for the #350 tests: a neutral TypeScript project, audited
 * through the CLI action (so `--mode` maps to the law scope exactly as for a
 * user), with every substantive law stubbed to pass — or one of them to fail.
 *
 * The two always-on meta-gates (Audit Liveness Assertion, Config Integrity
 * Guard) keep their real checks: the floor and the config keys are part of
 * what is being tested.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { executeAuditAction } from '../../src/cli/audit-command';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';

export const GOLDEN_DIR = path.join(
  __dirname,
  '__golden__',
  'waivers-named-verdict'
);

const PROJECT: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'neutral-fixture',
    version: '1.0.0',
    devDependencies: { typescript: '5.6.3' },
  }),
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
  'src/index.ts':
    'export const add = (a: number, b: number): number => a + b;\n',
};

/** The law forced to fail in the "fail" cells; empty string = all pass. */
const state = { failing: '' };

export function setFailingLaw(title: string): void {
  state.failing = title;
}

const made: string[] = [];

/**
 * Replace `check` on every substantive law: a pass, or a failure for the one
 * law named by setFailingLaw. Installed per describe block.
 */
export function stubLawChecks(): void {
  let spy: jest.SpyInstance | undefined;
  // Per test: the jest config restores every mock before each test.
  beforeEach(() => {
    const realGetAll = ModularLawsRegistry.getAll.bind(ModularLawsRegistry);
    spy = jest.spyOn(ModularLawsRegistry, 'getAll').mockImplementation(() =>
      realGetAll().map(law =>
        law.alwaysEnabled
          ? law
          : {
              ...law,
              check: (async () =>
                Promise.resolve(
                  law.name === state.failing
                    ? {
                        passed: false,
                        score: 0,
                        violations: ['forced failure (stub)'],
                        suggestions: [],
                        message: 'stub failure',
                      }
                    : {
                        passed: true,
                        score: 100,
                        violations: [],
                        suggestions: [],
                        message: 'stub pass',
                      }
                )) as unknown as typeof law.check,
            }
      )
    );
  });
  afterEach(() => setFailingLaw(''));
  afterEach(() => spy?.mockRestore());
  afterAll(() => {
    for (const dir of made.splice(0))
      fs.rmSync(dir, { recursive: true, force: true });
  });
}

export function makeFixture(config: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-350-'));
  made.push(root);
  writeFiles(root, {
    ...PROJECT,
    'ruleofcode.config.json': JSON.stringify(config, null, 2),
  });
  return root;
}

export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
}

/**
 * Rewrite the config only when it changes: touching the file changes the
 * cache key (files are keyed by size and mtime), and a cache test that
 * rewrites an identical config would never see a hit.
 */
function rewriteConfig(root: string, content: string): void {
  const file = path.join(root, 'ruleofcode.config.json');
  if (fs.readFileSync(file, 'utf8') !== content)
    fs.writeFileSync(file, content);
}

export interface AuditRun {
  exitCode: number;
  result: AuditResult & Record<string, unknown>;
  json: Record<string, any>;
  text: string;
  root: string;
}

/** Audit a fresh fixture (or `root`, to reuse one) through the CLI action. */
export async function auditFixture(options: {
  mode: string | undefined;
  laws: Record<string, unknown>;
  performance?: Record<string, unknown>;
  root?: string;
}): Promise<AuditRun> {
  const config = {
    project: { type: 'typescript' },
    laws: options.laws,
    ...(options.performance ? { performance: options.performance } : {}),
  };
  const root = options.root ?? makeFixture(config);
  if (options.root) rewriteConfig(root, JSON.stringify(config, null, 2));

  const out: string[] = [];
  const capture = (chunk: unknown): boolean => {
    out.push(String(chunk).replace(/\n$/, ''));
    return true;
  };
  const line = (...a: unknown[]): void => {
    out.push(a.map(String).join(' '));
  };
  const spies = [
    jest.spyOn(console, 'log').mockImplementation(line),
    jest.spyOn(console, 'warn').mockImplementation(line),
    jest.spyOn(console, 'error').mockImplementation(line),
    jest.spyOn(process.stdout, 'write').mockImplementation(capture),
    jest.spyOn(process.stderr, 'write').mockImplementation(capture),
  ];
  try {
    const outcome = await executeAuditAction({ mode: options.mode }, root);
    if (!outcome.result) throw outcome.error ?? new Error('no audit result');
    const result = outcome.result as AuditResult & Record<string, unknown>;
    return {
      exitCode: outcome.exitCode,
      result,
      json: JSON.parse(AuditResultProcessor.exportResults(result, 'json')),
      // eslint-disable-next-line no-control-regex
      text: out.join('\n').replace(/\u001b\[[0-9;]*m/g, ''),
      root,
    };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

/** Remove what changes from run to run: the temp path, timings, the version. */
export function normalizeText(text: string, root: string): string {
  return `${text
    .split(root)
    .join('<root>')
    .replace(/\d+ms\b/g, '<n>ms')
    .replace(/v\d+\.\d+\.\d+/g, 'v<version>')
    .replace(/[ \t]+$/gm, '')}\n`;
}

const VOLATILE_KEYS = new Set(['timestamp', 'duration', 'executionTime']);

/**
 * The JSON with the volatile values removed. `results[].config` is the input
 * config echoed by each meta-gate (with the temp root in it) — dropped, so the
 * golden is about what the engine REPORTS.
 */
export function normalizeJson(value: unknown, root: string): any {
  if (typeof value === 'string')
    return value
      .split(root)
      .join('<root>')
      .replace(/v\d+\.\d+\.\d+/g, 'v<version>');
  if (Array.isArray(value)) return value.map(item => normalizeJson(item, root));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (VOLATILE_KEYS.has(key) || key === 'config') continue;
      out[key] = normalizeJson(item, root);
    }
    return out;
  }
  return value;
}
