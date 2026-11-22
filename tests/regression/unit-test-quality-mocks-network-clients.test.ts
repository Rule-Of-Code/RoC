/**
 * #429 — Unit Test Quality said "Dependencies found but no mocking detected"
 * for any test with an `import … from`, a `require(`, `inject(` or `TestBed`
 * and no mock word: a test of its own module, a test building a temp-dir
 * fixture, a test spawning the CLI it ships. And "HTTP calls should be
 * mocked" fired on a `fetch(` inside a detector's fixture string.
 *
 * Now a dependency to mock is a network or service client the test loads,
 * read from its syntax tree (the clients Test Data Management names, minus
 * the filesystem and child processes), with no double in its code; the
 * finding names the clients. The HTTP check reads the code, not the text.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { UnitTestQualityLaw } from '../../src/checkers/testing-laws/unit-test-quality';
import { FileUtils } from '../../src/utils/file-utils';

// The child-process module, spelled in parts: the guard in
// tests/utils/child-process-guard.test.ts reads test files as text and
// would take this fixture string for an import of it.
const CHILD_PROCESS = ['child', 'process'].join('_');

const MOCKING = /no mocking detected|HTTP calls should be mocked/;

describe('#429 a dependency to mock is a network or service client', () => {
  let root: string;
  const write = (rel: string, lines: string[]): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, [...lines, ''].join('\n'));
  };
  const mockingFindings = async (): Promise<string[]> => {
    const result = await UnitTestQualityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'unit-test-quality-standards',
    });
    return (result.violations ?? []).filter(v => MOCKING.test(v));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-429-'));
    write('package.json', ['{"name":"x","version":"1.0.0"}']);
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('asks nothing of a test of its own module, a temp-dir fixture or a spawned CLI', async () => {
    write('src/audit.test.ts', [
      "import fs from 'fs';",
      "import os from 'os';",
      "import path from 'path';",
      `import { execFileSync } from '${CHILD_PROCESS}';`,
      "import { audit } from './audit';",
      "describe('audit', () => {",
      "  it('reads a fixture', () => {",
      "    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x-'));",
      '    expect(audit(dir)).toBe(0);',
      "    expect(execFileSync('node', ['cli.js']).length).toBeGreaterThan(0);",
      '  });',
      '});',
    ]);

    expect(await mockingFindings()).toEqual([]);
  });

  it('does not read a request a detector test keeps in a string', async () => {
    write('src/detector.test.ts', [
      "import { detect } from './detector';",
      "describe('detector', () => {",
      "  it('flags an unchecked fetch', () => {",
      "    expect(detect('const r = await fetch(url); r.json();')).toBe(true);",
      "    expect(detect('this.http.get<User[]>(url)')).toBe(true);",
      '  });',
      '});',
    ]);

    expect(await mockingFindings()).toEqual([]);
  });

  it('names a network client loaded with no double', async () => {
    write('src/api.test.ts', [
      "import axios from 'axios';",
      "import { load } from './api';",
      "describe('load', () => {",
      "  it('loads', async () => {",
      '    expect(await load(axios)).toBeDefined();',
      '  });',
      '});',
    ]);

    expect(await mockingFindings()).toEqual([
      'Dependencies found but no mocking detected in src/api.test.ts (axios)',
    ]);
  });

  it('is satisfied by a double of the client', async () => {
    write('src/api.test.ts', [
      "import axios from 'axios';",
      "import { load } from './api';",
      "jest.mock('axios');",
      "describe('load', () => {",
      "  it('loads', async () => {",
      '    expect(await load(axios)).toBeDefined();',
      '  });',
      '});',
    ]);

    expect(await mockingFindings()).toEqual([]);
  });

  it('still reports a request the test makes in its code', async () => {
    write('src/live.test.ts', [
      "describe('live', () => {",
      "  it('answers', async () => {",
      "    const r = await fetch('https://example.com/health');",
      '    expect(r.ok).toBe(true);',
      '  });',
      '});',
    ]);

    expect(await mockingFindings()).toEqual([
      'HTTP calls should be mocked in unit tests in src/live.test.ts',
    ]);
  });
});
