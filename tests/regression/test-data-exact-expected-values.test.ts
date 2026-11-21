/**
 * #439 (Test Data Management) — an exact expected value in an assertion,
 * `expect(result.lawName).toBe('angular-testing-excellence')`, was reported
 * as "hardcoded test data": any string of 20+ characters inside `toBe(…)`
 * matched. The value a test expects back is the assertion, not data fed in,
 * and no factory can produce it. Inline input data is still reported
 * (unit-test-data-management-constants.test.ts, hasHardcodedTestData).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';

const HARDCODED = 'Found hardcoded test data in test files';

describe('#439 an exact expected value is not hardcoded test data', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  /** The law's findings for a project holding one test file. */
  const findings = (testFile: string): string[] => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-439-tdm-'));
    dirs.push(dir);
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'tdm-439', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'law.test.ts'), testFile);
    const result = TestDataManagementLaw.check({
      projectRoot: dir,
      config: ConfigLoader.load(dir),
    });
    return result.violations ?? [];
  };

  it('does not report long exact strings an assertion expects', () => {
    const v = findings(
      [
        "import { lawOf } from './law';",
        "describe('lawOf', () => {",
        "  it('names the law', () => {",
        "    const result = lawOf('angular');",
        "    expect(result.lawName).toBe('angular-testing-excellence');",
        "    expect(result.message).toBe('No bundle size test files found');",
        '  });',
        '});',
        '',
      ].join('\n')
    );
    expect(v.filter(x => x.startsWith(HARDCODED))).toEqual([]);
  });
});
