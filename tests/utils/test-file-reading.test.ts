/**
 * TestFileReading — what Unit Test Quality reads of a test file beyond its
 * text (#429): whether it gives the code under test an input, whether the
 * runner resets mocks, and which mock setups only silence output.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import ts from 'typescript';

import { TestFileReading } from '../../src/utils/testing/test-coverage-analyzer/test-file-reading';

const lines = (...parts: string[]): string => parts.join('\n');
const callsWithInput = (content: string): boolean =>
  TestFileReading.callsWithInput(ts, content, 'x.test.ts');

describe('TestFileReading.callsWithInput', () => {
  it.each([
    [
      'an imported function',
      lines("import { audit } from './audit';", 'audit(dir);'),
    ],
    [
      'a method of an imported binding',
      lines("import { Analyzer } from './a';", 'Analyzer.check(root);'),
    ],
    ['an imported class', lines("import C from './c';", 'new C(config);')],
    [
      'a required binding',
      lines("const { run } = require('../src/run');", 'run(1);'),
    ],
  ])('sees an input given to %s', (_label, content) => {
    expect(callsWithInput(content)).toBe(true);
  });

  it.each([
    [
      'an export check',
      lines("import { Checker } from './c';", 'expect(Checker).toBeDefined();'),
    ],
    [
      'a constant table',
      lines("import { C } from './c';", 'expect(C.LIMIT).toBe(3);'),
    ],
    ['a call without argument', lines("import { C } from './c';", 'C.all();')],
    [
      'a value method of an imported table',
      lines("import { LAWS } from './laws';", 'LAWS.filter(l => l.on);'),
    ],
    [
      'a Node built-in',
      lines("import fs from 'node:fs';", "fs.readFileSync('x');"),
    ],
    [
      'a type-only import',
      lines("import type { F } from './f';", 'declare const f: F; f(1);'),
    ],
    ['no import at all', 'expect(1 + 1).toBe(2);'],
  ])('sees no input in %s', (_label, content) => {
    expect(callsWithInput(content)).toBe(false);
  });
});

describe('TestFileReading.runnerResetsMocks', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-429-runner-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (name: string, text: string): void =>
    fs.writeFileSync(path.join(root, name), text);

  it.each([
    ['jest.config.js', 'module.exports = { resetMocks: true };'],
    ['jest.config.ts', 'export default { restoreMocks: true };'],
    ['vitest.config.ts', 'export default { test: { mockReset: true } };'],
  ])('reads a reset switch in %s', (name, text) => {
    write(name, text);
    expect(TestFileReading.runnerResetsMocks(root)).toBe(true);
  });

  it("reads package.json's jest key", () => {
    write('package.json', JSON.stringify({ jest: { clearMocks: true } }));
    expect(TestFileReading.runnerResetsMocks(root)).toBe(true);
  });

  it('finds none when the switch is off, commented out or absent', () => {
    write(
      'jest.config.js',
      'module.exports = { resetMocks: false }; // restoreMocks: true'
    );
    write('package.json', JSON.stringify({ name: 'x' }));
    expect(TestFileReading.runnerResetsMocks(root)).toBe(false);
  });

  it('finds none in a package.json that is not JSON', () => {
    write('package.json', '{ not json');
    expect(TestFileReading.runnerResetsMocks(root)).toBe(false);
  });
});

describe('TestFileReading.silencedOutputSetups', () => {
  it('counts spies that only silence the console or a stream', () => {
    expect(
      TestFileReading.silencedOutputSetups(
        lines(
          "jest.spyOn(console, 'log').mockImplementation(() => undefined);",
          "jest.spyOn(process.stdout, 'write').mockImplementation(quiet);",
          "jest.spyOn(api, 'get').mockImplementation(() => 1);"
        )
      )
    ).toBe(2);
  });
});
