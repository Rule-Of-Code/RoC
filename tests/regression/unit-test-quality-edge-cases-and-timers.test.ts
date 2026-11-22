/**
 * #429 — the rest of Unit Test Quality's templates on this repository:
 *
 * - "No edge case testing" missed negative titles ("does NOT flag …") and
 *   `toBe(false)`, and was asked of files with no input at all (export
 *   checks, constant tables);
 * - "Excessive mocking" counted `it.each(` as no test, and the spies that
 *   only silence the console as doubles;
 * - "setTimeout usage" matched `jest.setTimeout(n)` (the test's time
 *   limit) and a watchdog the test clears;
 * - "Mock functions without cleanup" did not read the runner's
 *   `resetMocks`/`restoreMocks`/`clearMocks`, and read `jest.fn()` in a
 *   fixture string.
 *
 * Each control keeps the real finding.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { UnitTestQualityLaw } from '../../src/checkers/testing-laws/unit-test-quality';
import { FileUtils } from '../../src/utils/file-utils';

describe('#429 edge cases, test counts, timers and mock cleanup', () => {
  let root: string;
  const write = (rel: string, lines: string[]): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, [...lines, ''].join('\n'));
  };
  const findings = async (template: RegExp): Promise<string[]> => {
    const result = await UnitTestQualityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'unit-test-quality-standards',
    });
    return (result.violations ?? []).filter(v => template.test(v));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-429b-'));
    write('package.json', ['{"name":"x","version":"1.0.0"}']);
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('No edge case testing', () => {
    const EDGE = /No edge case testing/;

    it('reads a negative title and toBe(false) as edge cases', async () => {
      write('src/cast.test.ts', [
        "import { flags } from './cast';",
        "it('does NOT flag a single cast', () => {",
        "  expect(flags('x as T')).toBe(false);",
        '});',
      ]);
      expect(await findings(EDGE)).toEqual([]);
    });

    it('asks nothing of a file with no input (export checks)', async () => {
      write('src/index.test.ts', [
        "import { Checker, Auditor } from './index';",
        "it('exports the checker', () => {",
        '  expect(Checker).toBeDefined();',
        '  expect(Auditor).toBeDefined();',
        '});',
      ]);
      expect(await findings(EDGE)).toEqual([]);
    });

    it('still asks a test that gives an input and tests one path', async () => {
      write('src/sum.test.ts', [
        "import { sum } from './sum';",
        "it('adds', () => {",
        '  expect(sum(1, 2)).toBe(3);',
        '});',
      ]);
      expect(await findings(EDGE)).toEqual([
        'No edge case testing found in src/sum.test.ts',
      ]);
    });
  });

  describe('Excessive mocking', () => {
    const EXCESS = /Excessive mocking/;

    it('counts it.each as a test, and silencing the console as no double', async () => {
      write('src/table.test.ts', [
        "import { run } from './run';",
        "jest.spyOn(console, 'log').mockImplementation(() => undefined);",
        "jest.spyOn(console, 'warn').mockImplementation(() => undefined);",
        'const fetcher = jest.fn().mockReturnValue(1);',
        "it.each([[1], [2]])('runs %s', n => {",
        '  expect(run(n, fetcher)).toBe(1);',
        '});',
      ]);
      expect(await findings(EXCESS)).toEqual([]);
    });

    it('still reports many doubles for one test', async () => {
      write('src/many.test.ts', [
        "import { run } from './run';",
        'const a = jest.fn().mockReturnValue(1);',
        'const b = jest.fn().mockReturnValue(2);',
        'const c = jest.fn().mockReturnValue(3);',
        "it('runs', () => {",
        '  expect(run(a, b, c)).toBe(6);',
        '});',
      ]);
      expect(await findings(EXCESS)).toEqual([
        'Excessive mocking detected - consider integration testing approach in src/many.test.ts',
      ]);
    });
  });

  describe('setTimeout usage', () => {
    const TIMER = /setTimeout usage/;

    it('reads neither jest.setTimeout nor a watchdog the test clears', async () => {
      write('src/cli.test.ts', [
        "import { spawnCli } from './cli';",
        'jest.setTimeout(120000);',
        "it('ends', async () => {",
        '  const child = spawnCli([]);',
        '  await new Promise((resolve, reject) => {',
        "    const limit = setTimeout(() => reject(new Error('hung')), 60000);",
        "    child.on('close', () => {",
        '      clearTimeout(limit);',
        '      resolve(undefined);',
        '    });',
        '  });',
        '});',
      ]);
      expect(await findings(TIMER)).toEqual([]);
    });

    it('still reports a sleep', async () => {
      write('src/sleep.test.ts', [
        "import { run } from './run';",
        "it('runs', async () => {",
        '  await new Promise(resolve => setTimeout(resolve, 50));',
        '  expect(run(1)).toBe(1);',
        '});',
      ]);
      expect(await findings(TIMER)).toEqual([
        'setTimeout usage without fake timers may cause test flakiness in src/sleep.test.ts',
      ]);
    });
  });

  describe('Mock functions without cleanup', () => {
    const CLEANUP = /without cleanup/;
    const spec = [
      "import { run } from './run';",
      'const fn = jest.fn();',
      "it('runs', () => {",
      '  expect(run(fn)).toBe(1);',
      '});',
    ];

    it("reads the runner's resetMocks", async () => {
      write('jest.config.js', ['module.exports = { resetMocks: true };']);
      write('src/run.test.ts', spec);
      expect(await findings(CLEANUP)).toEqual([]);
    });

    it('does not read jest.fn() in a fixture string', async () => {
      write('src/detector.test.ts', [
        "import { detect } from './detector';",
        "it('reads a mock', () => {",
        "  expect(detect('const s = jest.fn();')).toBe(true);",
        '});',
      ]);
      expect(await findings(CLEANUP)).toEqual([]);
    });

    it('still reports a mock nobody resets', async () => {
      write('src/run.test.ts', spec);
      expect(await findings(CLEANUP)).toEqual([
        'Mock functions without cleanup may cause test interference in src/run.test.ts',
      ]);
    });
  });
});
