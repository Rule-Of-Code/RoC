import { ConfigFileUtils } from '../config-file-utils';
import { DirectoryScanner } from '../directory-scanner';
import { PathOperations } from '../path-operations';

/**
 * File Scanner Base
 * Abstract base class for recursive file scanning utilities
 */
export class FileScannerBase {
  /**
   * Generic recursive file search with predicate function
   */
  protected static searchFilesRecursivelyWithPredicate(
    directory: string,
    predicate: (entryName: string) => boolean,
    results: string[],
    onDirectory?: (nextDir: string) => void
  ): void {
    try {
      const entries = DirectoryScanner.safeReadDirectory(
        directory,
        ConfigFileUtils.getMinimalDefaultConfig()
      );

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          if (onDirectory) {
            onDirectory(fullPath);
          }
        } else if (entry.isFile() && predicate(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Recursively search for files matching patterns (string-based)
   */
  protected static searchFilesRecursivelyByString(
    directory: string,
    patterns: string[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      (name: string) => patterns.includes(name),
      results,
      (nextDir: string) => {
        this.searchFilesRecursivelyByString(nextDir, patterns, results);
      }
    );
  }

  /**
   * Recursively search for files matching patterns (regex-based)
   */
  protected static searchFilesRecursivelyByRegex(
    directory: string,
    patterns: RegExp[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      (name: string) => patterns.some(pattern => pattern.test(name)),
      results,
      (nextDir: string) => {
        this.searchFilesRecursivelyByRegex(nextDir, patterns, results);
      }
    );
  }

  /**
   * Check if directory should be skipped during scanning
   */
  protected static shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = [
      'node_modules',
      'dist',
      '.git',
      'coverage',
      '.nx',
      'build',
      '.angular',
      'out',
    ];
    return skipDirs.includes(dirname);
  }

  /**
   * Generic initialization for recursive directory scanning
   * Consolidates common try-catch pattern for DirectoryScanner.safeReadDirectory calls
   */
  protected static initializeDirectoryScan(directory: string): {
    entries: Array<{
      name: string;
      isDirectory: () => boolean;
      isFile: () => boolean;
    }> | null;
  } {
    try {
      const entries = DirectoryScanner.safeReadDirectory(
        directory,
        ConfigFileUtils.getMinimalDefaultConfig()
      );
      return { entries };
    } catch (_error) {
      return { entries: null };
    }
  }
}
