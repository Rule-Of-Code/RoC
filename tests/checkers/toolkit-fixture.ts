/**
 * Fixtures for the Ionic and Capacitor laws: a throwaway project with nested
 * paths, and a stand-in `@capacitor/cli` that is EXECUTED (the laws run the
 * project's own CLI through execFileSync, so the stand-in exercises that real
 * path instead of mocking it).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { LawCheckContext } from '../../src/types';

const dirs: string[] = [];

/** A temp project; keys are relative paths (nested directories are created). */
export function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-toolkit-'));
  dirs.push(dir);
  writeFiles(dir, files);
  return dir;
}

export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

export function removeProjects(): void {
  for (const dir of dirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}

/** package.json declaring the given dependencies. */
export function manifest(dependencies: Record<string, string>): string {
  return JSON.stringify({ name: 'fixture', version: '1.0.0', dependencies });
}

/**
 * Install a stand-in `@capacitor/cli` under `<root>/node_modules`. `printed`
 * is what `cap config --json` writes to stdout; `exitCode` other than 0 makes
 * it fail the way the real CLI does on a config it cannot parse (stderr, no
 * stdout). Each run appends a line to `cli-runs.log`, so a test can count runs.
 */
export function fakeCapacitorCli(
  root: string,
  printed: unknown,
  exitCode = 0
): void {
  const cliDir = path.join(root, 'node_modules', '@capacitor', 'cli');
  writeFiles(cliDir, {
    'package.json': JSON.stringify({
      name: '@capacitor/cli',
      version: '8.6.0',
      bin: { capacitor: './bin/capacitor', cap: './bin/capacitor' },
    }),
    'bin/capacitor': [
      "const fs = require('fs');",
      "const path = require('path');",
      `fs.appendFileSync(path.join(process.cwd(), 'cli-runs.log'), process.argv.slice(2).join(' ') + '\\n');`,
      exitCode === 0
        ? `process.stdout.write(${JSON.stringify(JSON.stringify(printed))} + '\\n');`
        : `process.stderr.write('[error] Parsing capacitor.config.ts failed.\\n'); process.exit(${exitCode});`,
    ].join('\n'),
  });
}

/** What `cap config --json` prints for an extConfig, with the platform paths it resolves. */
export function printedConfig(
  root: string,
  extConfig: Record<string, unknown>
): Record<string, unknown> {
  const android = path.join(root, 'android');
  const ios = path.join(root, 'ios');
  return {
    android: {
      platformDirAbs: android,
      appDirAbs: path.join(android, 'app'),
      srcMainDirAbs: path.join(android, 'app', 'src', 'main'),
    },
    ios: {
      platformDirAbs: ios,
      nativeTargetDirAbs: path.join(ios, 'App', 'App'),
      nativeXcodeProjDirAbs: path.join(ios, 'App', 'App.xcodeproj'),
    },
    app: { extConfig },
  };
}

export const ctx = (
  root: string,
  overrides: Record<string, unknown> = {}
): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'ionic' },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: { parallel: false, maxConcurrent: 3, cache: false },
      thresholds: {},
      ...overrides,
    },
  }) as LawCheckContext;
