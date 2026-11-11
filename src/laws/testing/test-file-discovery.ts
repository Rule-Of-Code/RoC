import { TEST_FILE_NAME } from '../../utils/file-constants';
import type { RuleOfCodeConfig } from '../../types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/** The law id discovery scans under, for the scanner's per-law ignores. */
const DISCOVERY_LAW_ID = 'test-file-discovery';

/** Where test files are looked for, relative to the project root. */
const DEFAULT_TEST_ROOTS = ['src', 'apps', 'libs', 'test', 'tests', 'e2e'];

/** Every extension a test file is written in (the TEST_FILE_GLOBS spellings). */
const TEST_FILE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];

/**
 * Shared test file discovery logic used across all test analyzers.
 *
 * Laws that judge the same thing must read the same files: two laws with one
 * check and two discoveries pass and fail the same file depending on which of
 * them looks (#192). Callers pass the project's own config and let discovery
 * choose the roots.
 */
export class TestFileDiscovery {
  /**
   * Find all test files under the standard test roots, with the project's
   * ignores matched against the path from the project root.
   */
  static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    customSearchDirs?: string[]
  ): string[] {
    const searchDirs = (
      customSearchDirs ??
      DEFAULT_TEST_ROOTS.map(dir => PathOperations.join(projectRoot, dir))
    ).filter(dir => FileUtils.exists(dir));
    if (searchDirs.length === 0) return [];

    // One scan from the PROJECT root, then keep what lies under a search
    // root. Scanning each root on its own matched the project's patterns
    // against the path from that root: an `ignores.global` entry like
    // `src/vendor/**` was compared with `vendor/c.spec.ts` and never matched,
    // and an `includes.global` entry like `apps/**` matched nothing at all.
    const prefixes = searchDirs.map(dir =>
      `${PathOperations.getRelative(projectRoot, dir)}/`
    );
    const testFiles: string[] = [];
    this.findTestFilesRecursively(projectRoot, testFiles, config);
    return testFiles.filter(file => {
      const relative = PathOperations.getRelative(projectRoot, file);
      return prefixes.some(prefix => prefix === '/' || relative.startsWith(prefix));
    });
  }

  /**
   * The verdict of a test law that found no test file to judge: a violation
   * that says so, never a pass. Before, both isolation twins scored 100 on a
   * scope with no tests in it — including RoC's own audit, whose config hid
   * every test from them — which is a green that inspected nothing.
   */
  static nothingToJudge(lawName: string): string {
    return `${lawName}: no JS/TS test file found under ${DEFAULT_TEST_ROOTS.join(', ')} after the project's ignores — nothing was judged. If tests exist, keep them out of ignores.global (ignores.tests hides them from source scans only); if the project has none, that is the finding`;
  }

  static findTestFilesRecursively(
    dir: string,
    testFiles: string[],
    config: RuleOfCodeConfig
  ): void {
    try {
      // `.test.tsx` / `.spec.jsx` are test names (TEST_FILE_NAME), but a scan
      // for `ts`/`js` alone never offered those files to the name check.
      const files = CheckerUtils.findFilesByExtension(
        dir,
        TEST_FILE_EXTENSIONS,
        config,
        DISCOVERY_LAW_ID, // Pass law ID for debugging
        true // includeTests = true - this is crucial for finding test files!
      );

      for (const file of files) {
        // PROFESSIONAL FIX: Use getFilename() to preserve extension (.spec.ts/.test.ts)
        // getBasename() strips extension, but isTestFile() needs full filename with extension
        const fileName = PathOperations.getFilename(file);
        if (this.isTestFile(fileName)) {
          testFiles.push(file);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Check if file is a test file
   */
  static isTestFile(filename: string): boolean {
    return TEST_FILE_NAME.test(filename) || filename.includes('.e2e-spec.');
  }
}
