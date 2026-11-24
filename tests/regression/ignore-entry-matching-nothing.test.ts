/**
 * #414, point 2 — an `ignores.global` entry that matches no file in the
 * project excludes nothing, and the audit says nothing about it.
 *
 * Point 1 (one form for every way of writing a pattern) is done: a Windows
 * path, `./`, a trailing slash and an absolute path inside the project all
 * match now, and an absolute path outside the project is named. What is left
 * is the entry that is written correctly and still points nowhere: a typo
 * (`vendr/**`), a directory that was renamed or deleted. The user believes the
 * code is excluded; it is judged, and no line of the output hints that the
 * entry is dead.
 *
 * Only what the project wrote is judged. The defaults the loader adds to
 * `ignores.global` (`**\/dist/**`, `**\/node_modules/**`, ...) match nothing in
 * most projects and are not the user's mistake.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { spawnSync } from '../../src/utils/child-process';
import { builtCli } from '../helpers/built-cli';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

describe('#414 an ignores.global entry that matches no file is named', () => {
  jest.setTimeout(120000);
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-414-dead-'));
    const write = (rel: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write('package.json', JSON.stringify({ name: 'dead', version: '1.0.0' }));
    write('src/app.ts', 'export const app = 1;\n');
    write('vendor/lib.js', 'module.exports = 3;\n');
    write(
      'ruleofcode.config.json',
      JSON.stringify({
        project: { type: 'typescript' },
        // a typo next to the entry that does match
        ignores: { global: ['vendr/**', 'vendor/**'] },
        laws: { enabled: { 'Test Coverage Constitutional Standard': true } },
      })
    );
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const audit = (): string => {
    builtCli();
    const run = spawnSync(
      process.execPath,
      [CLI, 'audit', '--mode=full', '--json'],
      { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    return `${run.stdout}\n${run.stderr}`;
  };

  it('the dead entry is named, the live one and the defaults are not', () => {
    const output = audit();
    expect(output).toContain("ignores.global: 'vendr/**' matched no file");
    expect(output).not.toContain("ignores.global: 'vendor/**' matched no file");
    expect(output).not.toContain(
      "ignores.global: '**/dist/**' matched no file"
    );
  });
});

describe('#414 an entry the project also gitignores is generated output, not a typo', () => {
  jest.setTimeout(120000);
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-414-gitignored-'));
    const write = (rel: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write('package.json', JSON.stringify({ name: 'gen', version: '1.0.0' }));
    write('src/app.ts', 'export const app = 1;\n');
    // coverage/ is not there (a fresh clone, a CI checkout) and is ignored
    write('.gitignore', 'node_modules/\ncoverage/\n');
    write(
      'ruleofcode.config.json',
      JSON.stringify({
        project: { type: 'typescript' },
        ignores: { global: ['coverage/**', 'vendr/**'] },
        laws: { enabled: { 'Test Coverage Constitutional Standard': true } },
      })
    );
    spawnSync('git', ['init', '-q'], { cwd: dir });
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('the gitignored entry is not named, the typo still is', () => {
    builtCli();
    const run = spawnSync(
      process.execPath,
      [CLI, 'audit', '--mode=full', '--json'],
      { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    const output = `${run.stdout}\n${run.stderr}`;
    expect(output).toContain("ignores.global: 'vendr/**' matched no file");
    expect(output).not.toContain(
      "ignores.global: 'coverage/**' matched no file"
    );
  });
});
