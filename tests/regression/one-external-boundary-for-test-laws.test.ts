/**
 * #491 — Unit Test Quality and Test Data Management both ask whether a test
 * reaches something outside its process with no double in place, and they
 * answered it from two definitions: Test Data Management counts the
 * filesystem and a child process as external, Unit Test Quality (after #429)
 * does not; Unit Test Quality takes a named double (`fakeClient`) and an
 * unmocked `fetch(` into account, Test Data Management does not. So the same
 * test was "external data" for one law and "no external dependency" for the
 * other.
 *
 * One definition of an external boundary and of a test double, so the two
 * laws give the same answer for the same test. Which way the filesystem
 * goes is measured before the fix ships; these tests ask only that both
 * laws agree, and pin the cases that are not in question.
 */
import { removeProjects } from '../checkers/toolkit-fixture';
import { mockingVerdict } from './external-boundary-fixture';

const TEMP_DIR_TEST = [
  "import fs from 'fs';",
  "import os from 'os';",
  "import path from 'path';",
  "import { audit } from './audit';",
  "describe('audit', () => {",
  "  it('reads a fixture directory', () => {",
  "    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x-'));",
  '    expect(audit(dir)).toBe(0);',
  '  });',
  '});',
];

const UNMOCKED_HTTP_CLIENT = [
  "import axios from 'axios';",
  "import { load } from './api';",
  "describe('load', () => {",
  "  it('loads', async () => {",
  '    expect(await load(axios)).toBeDefined();',
  '  });',
  '});',
];

const NAMED_FAKE_CLIENT = [
  "import axios from 'axios';",
  "import { load } from './api';",
  "describe('load', () => {",
  "  it('loads through a fake transport', async () => {",
  '    const fakeAxios = { get: async () => ({ data: 1 }) } as unknown as typeof axios;',
  '    expect(await load(fakeAxios)).toBeDefined();',
  '  });',
  '});',
];

const UNMOCKED_GLOBAL_FETCH = [
  "describe('live', () => {",
  "  it('answers', async () => {",
  "    const r = await fetch('https://example.com/health');",
  '    expect(r.ok).toBe(true);',
  '  });',
  '});',
];

describe('#491 one definition of an external boundary for both test laws', () => {
  afterEach(removeProjects);

  it.each([
    ['a test in a temporary directory', TEMP_DIR_TEST],
    ['a test with an unmocked HTTP client', UNMOCKED_HTTP_CLIENT],
    ['a test with a named fake of the HTTP client', NAMED_FAKE_CLIENT],
    ['a test calling the global fetch with no double', UNMOCKED_GLOBAL_FETCH],
  ])('both laws judge %s the same way', async (_name, lines) => {
    const verdict = await mockingVerdict({ 'src/x.test.ts': lines });
    expect(verdict.testDataManagement).toBe(verdict.unitTestQuality);
  });

  /** The cases that are not in question, for both laws. */
  it('both ask for a double of an unmocked HTTP client', async () => {
    expect(
      await mockingVerdict({ 'src/api.test.ts': UNMOCKED_HTTP_CLIENT })
    ).toEqual({ unitTestQuality: true, testDataManagement: true });
  });

  it('both take a named fake for a double', async () => {
    expect(
      await mockingVerdict({ 'src/api.test.ts': NAMED_FAKE_CLIENT })
    ).toEqual({ unitTestQuality: false, testDataManagement: false });
  });

  it('both ask for a double of an unmocked global fetch', async () => {
    expect(
      await mockingVerdict({ 'src/live.test.ts': UNMOCKED_GLOBAL_FETCH })
    ).toEqual({ unitTestQuality: true, testDataManagement: true });
  });
});
