import { ConfigFileUtils } from './config-file-utils';
import { DirectoryScanner } from './directory-scanner';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

/**
 * Directory Searcher Utility
 * Centralizes common directory search patterns across the codebase
 * Eliminates duplicated code in 20+ files that search src/apps/libs
 */
export class DirectorySearcher {
  /**
   * Standard source directories used across project analyzers
   */
  static readonly STANDARD_SOURCE_DIRS = ['src', 'apps', 'libs'] as const;

  /**
   * Standard test directories
   */
  static readonly STANDARD_TEST_DIRS = [
    'test',
    'tests',
    'e2e',
    'spec',
  ] as const;

  /**
   * Get full paths for standard source directories
   */
  static getStandardSourceDirs(projectRoot: string): string[] {
    return DirectorySearcher.STANDARD_SOURCE_DIRS.map(dir =>
      PathOperations.join(projectRoot, dir)
    ).filter(dir => FileUtils.exists(dir));
  }

  /**
   * Get full paths for standard test directories
   */
  static getStandardTestDirs(projectRoot: string): string[] {
    return DirectorySearcher.STANDARD_TEST_DIRS.map(dir =>
      PathOperations.join(projectRoot, dir)
    ).filter(dir => FileUtils.exists(dir));
  }

  /**
   * Search directories for matching files recursively
   * Generic callback-based pattern used across multiple analyzers
   */
  static searchDirectoriesRecursively(
    directories: string[],
    callback: (filePath: string) => void
  ): void {
    const config = ConfigFileUtils.getDefaultConfig();
    for (const directory of directories) {
      if (!FileUtils.exists(directory)) continue;
      DirectorySearcher.searchDirectoryRecursively(directory, callback, config);
    }
  }

  /**
   * Search single directory recursively using DirectoryScanner
   */
  private static searchDirectoryRecursively(
    dir: string,
    callback: (filePath: string) => void,
    config: ReturnType<typeof ConfigFileUtils.getDefaultConfig>
  ): void {
    try {
      const entries = DirectoryScanner.safeReadDirectory(dir, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          DirectorySearcher.searchDirectoryRecursively(
            fullPath,
            callback,
            config
          );
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Find files matching pattern in standard directories
   */
  static findFilesInStandardDirs(
    projectRoot: string,
    predicate: (filePath: string) => boolean
  ): string[] {
    const matches: string[] = [];
    const dirs = DirectorySearcher.getStandardSourceDirs(projectRoot);

    DirectorySearcher.searchDirectoriesRecursively(dirs, filePath => {
      if (predicate(filePath)) {
        matches.push(filePath);
      }
    });

    return matches;
  }
}
