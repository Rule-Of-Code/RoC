import type { RuleOfCodeConfig } from '../../types';
import { DirectoryScanner } from '../../utils/directory-scanner';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/**
 * Test Analyzer Mixin
 * Consolidates common test file discovery patterns across testing analyzers
 * Eliminates duplicated directory iteration and file filtering logic
 */
export class TestAnalyzerMixin {
  /**
   * Generic test file discovery method
   * Searches standard test directories and filters by predicate function
   *
   * NOTE: Uses DirectoryScanner with useConfigFiltering=false because test files
   * are often outside the normal includes patterns. We rely on the predicate
   * function to do the actual filtering instead.
   */
  protected static findTestFilesInDirectories(
    projectRoot: string,
    searchDirs: string[],
    isTestFile: (filepath: string) => boolean,
    config: RuleOfCodeConfig
  ): string[] {
    const testFiles: string[] = [];

    for (const searchDir of searchDirs) {
      if (FileUtils.exists(searchDir)) {
        // Scan without config filtering - test dirs are special
        const result = DirectoryScanner.scanDirectory(searchDir, config, {
          extensions: ['.ts'],
          filesOnly: true,
          useConfigFiltering: false, // Don't use config whitelist for test discovery
        });

        // Filter by the specific test file predicate
        for (const file of result.files) {
          if (isTestFile(file)) {
            testFiles.push(file);
          }
        }
      }
    }

    return testFiles;
  }

  /**
   * Build common test directories for a project
   */
  protected static buildTestSearchDirs(
    projectRoot: string,
    additionalDirs: string[] = []
  ): string[] {
    const defaultDirs = [
      PathOperations.join(projectRoot, 'src'),
      PathOperations.join(projectRoot, 'tests'),
      PathOperations.join(projectRoot, 'test'),
      PathOperations.join(projectRoot, 'e2e'),
    ];

    // Nx / monorepo layouts keep code under apps/* and libs/* (often nested,
    // e.g. libs/<domain>/<type>/src) instead of a single root src/. Add those
    // project source roots so test discovery works there too.
    let nxDirs: string[] = [];
    try {
      const { glob } = require('glob');
      nxDirs = glob.sync('{apps,libs,packages}/**/src', {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
    } catch {
      // glob unavailable — fall back to the default dirs only
    }

    return [
      ...defaultDirs,
      ...nxDirs,
      ...additionalDirs.map(dir => PathOperations.join(projectRoot, dir)),
    ];
  }
}
