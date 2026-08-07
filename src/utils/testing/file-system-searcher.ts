import type { RuleOfCodeConfig } from '../../config/types';
import { DirectoryScanner } from '../directory-scanner';
import { PathOperations } from '../path-operations';

/**
 * Generic File System Searcher
 * RULE 1: Single source of truth - eliminated wrapper method
 * RULE 2: Optimize internals - consolidate duplicate matching logic
 * Unifies duplicate file search implementations
 */
export class FileSystemSearcher {
  /**
   * Default config for DirectoryScanner operations
   * RULE 1: Centralized configuration
   */
  private static readonly DEFAULT_CONFIG = {
    minSeverity: 'error',
  } as unknown as RuleOfCodeConfig;
  /**
   * Recursively search for files matching predicate
   * RULE 1: Direct public method (previously had unnecessary wrapper)
   * RULE 2: Eliminates duplicate search logic across three methods
   * Generic implementation handles all search scenarios
   */
  static searchFilesRecursively(
    directory: string,
    shouldInclude: (filename: string) => boolean,
    shouldSkipDir: (dirname: string) => boolean,
    results: string[],
    config: RuleOfCodeConfig
  ): void {
    try {
      // DirectoryScanner.safeReadDirectory requires config
      const entries = DirectoryScanner.safeReadDirectory(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !shouldSkipDir(entry.name)) {
          // Recursive call with same config
          FileSystemSearcher.searchFilesRecursively(
            fullPath,
            shouldInclude,
            shouldSkipDir,
            results,
            config
          );
        } else if (entry.isFile() && shouldInclude(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Generic matcher for any predicate
   * RULE 2: Consolidates duplicate .some() logic from four separate methods
   * All matching methods delegate to this single implementation
   * @private
   */
  private static anyMatches<T>(
    items: readonly T[],
    predicate: (item: T) => boolean
  ): boolean {
    return items.some(predicate);
  }

  /**
   * Check if filename matches exact names in list
   * Used for config file discovery
   * RULE 2: Delegates to generic anyMatches helper
   */
  static matchesExactName(filename: string, names: readonly string[]): boolean {
    return FileSystemSearcher.anyMatches(names, name => name === filename);
  }

  /**
   * Check if filename matches regex patterns
   * Used for test file discovery
   * RULE 2: Delegates to generic anyMatches helper
   */
  static matchesPatterns(
    filename: string,
    patterns: readonly RegExp[]
  ): boolean {
    return FileSystemSearcher.anyMatches(patterns, pattern =>
      pattern.test(filename)
    );
  }

  /**
   * Check if filename has any of the given extensions
   * RULE 2: Delegates to generic anyMatches helper
   */
  static hasExtension(
    filename: string,
    extensions: readonly string[]
  ): boolean {
    return FileSystemSearcher.anyMatches(extensions, ext =>
      filename.endsWith(ext)
    );
  }

  /**
   * Check if filename contains any of the given patterns
   * RULE 2: Delegates to generic anyMatches helper
   */
  static containsPattern(
    filename: string,
    patterns: readonly string[]
  ): boolean {
    return FileSystemSearcher.anyMatches(patterns, pattern =>
      filename.includes(pattern)
    );
  }
}
