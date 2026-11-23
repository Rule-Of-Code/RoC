/**
 * #539 — Test Coverage Constitutional Standard does not ask a test of an
 * entry point or a barrel (`index.ts`, `main.ts`, `polyfills.ts`). The
 * patterns were not anchored to the file name, so they matched the end of
 * any name: `domain.ts` ("…main.ts"), `remain.ts` and `app-index.ts` were
 * taken for entry points and never asked for a test.
 */
import { TestFilesExistenceChecker } from '../../src/utils/testing/test-files-existence-checker';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const SOURCE = 'export const answer = (): number => 42;\n';

/** The files the law names as lacking a test, from its suggestion line. */
const lacking = (files: string[]): string[] => {
  const root = project(Object.fromEntries(files.map(file => [file, SOURCE])));
  const { suggestions } = TestFilesExistenceChecker.checkTestFilesExistence(
    root,
    FileUtils.getMinimalDefaultConfig()
  );
  const line = suggestions.find(s => s.startsWith('Add test files for: '));
  return line
    ? line
        .slice('Add test files for: '.length)
        .split(', ')
        .map(file => file.replace(/\\/g, '/'))
        .sort()
    : [];
};

describe('#539 entry-point patterns match the file name, not its ending', () => {
  afterEach(removeProjects);

  it('asks a test of domain.ts, remain.ts and app-index.ts, as of any file', () => {
    expect(
      lacking([
        'src/answer.ts',
        'src/domain.ts',
        'src/remain.ts',
        'src/app-index.ts',
        'src/my-polyfills.ts',
      ])
    ).toEqual([
      'src/answer.ts',
      'src/app-index.ts',
      'src/domain.ts',
      'src/my-polyfills.ts',
      'src/remain.ts',
    ]);
  });

  /** The green controls: real entry points and barrels stay skipped. */
  it('still skips index.ts, main.ts and polyfills.ts', () => {
    expect(
      lacking([
        'src/index.ts',
        'src/main.ts',
        'src/polyfills.ts',
        'src/app/index.js',
        'src/server/main.js',
      ])
    ).toEqual([]);
  });
});
