/**
 * `.test.tsx` was source (#208).
 *
 * React writes component tests as `Button.test.tsx`. The default test globs
 * listed only `.ts` and `.js`, so those files were scanned as SOURCE by every
 * law that reads source, and missed by every law that counts tests. Both
 * directions are tested here, through the real scan with the default config.
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import type { RuleOfCodeConfig } from '../../src/types/law.types';
import { TEST_FILE_GLOBS } from '../../src/utils/constants';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const names = (files: string[]): string[] =>
  files.map(file => file.replace(/\\/g, '/').split('/').pop() ?? '').sort();

describe('test files in every React spelling', () => {
  const root = project({
    'src/Button.tsx': 'export const B = 1;',
    'src/Button.test.tsx': 'test("b", () => {});',
    'src/Card.spec.jsx': 'test("c", () => {});',
    'src/util.test.ts': 'test("u", () => {});',
  });
  const config = DEFAULT_CONFIG as unknown as RuleOfCodeConfig;

  it('the default config lists the .tsx and .jsx spellings', () => {
    for (const glob of ['**/*.test.tsx', '**/*.spec.tsx', '**/*.test.jsx', '**/*.spec.jsx']) {
      expect(TEST_FILE_GLOBS).toContain(glob);
      expect(DEFAULT_CONFIG.ignores?.tests).toContain(glob);
    }
  });

  it('a source scan leaves them out', () => {
    const source = FileUtils.scanForFiles(root, config, ['.ts', '.tsx', '.jsx'], undefined, false);
    expect(names(source)).toEqual(['Button.tsx']);
  });

  it('a scan that includes tests finds them (the control)', () => {
    const all = FileUtils.scanForFiles(root, config, ['.ts', '.tsx', '.jsx'], undefined, true);
    expect(names(all)).toEqual(['Button.test.tsx', 'Button.tsx', 'Card.spec.jsx', 'util.test.ts']);
  });
});
