/**
 * File Scanner Helper Base
 * Consolidates duplicate file scanning initialization patterns
 */

import type { RuleOfCodeConfig } from '../types/law.types';
import { DirectoryScanner } from './directory-scanner';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

export class FileScannerHelper {
  /**
   * Safely scans directory with error handling
   * Common pattern used across multiple scanners
   */
  static safeDirectoryScan(
    directory: string,
    config: RuleOfCodeConfig
  ): Array<{ name: string; isDirectory: () => boolean }> {
    try {
      return DirectoryScanner.safeReadDirectory(directory, config);
    } catch (_error) {
      return [];
    }
  }

  /**
   * Recursively scans directory tree with callback
   * Common pattern for depth-first directory traversal
   */
  static recursiveDirectoryScan(
    directory: string,
    config: RuleOfCodeConfig,
    onEntry: (
      path: string,
      entry: { name: string; isDirectory: () => boolean }
    ) => boolean
  ): void {
    try {
      const entries = this.safeDirectoryScan(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        // onEntry returns true to skip this entry
        if (onEntry(fullPath, entry)) {
          continue;
        }

        if (entry.isDirectory()) {
          this.recursiveDirectoryScan(fullPath, config, onEntry);
        }
      }
    } catch (_error) {
      // Silent fail
    }
  }

  /**
   * Gets files in directory matching extension
   */
  static getFilesWithExtension(
    directory: string,
    extension: string,
    config: RuleOfCodeConfig
  ): string[] {
    return this.getAllFilesInDirectory(directory, config, path =>
      path.endsWith(extension)
    );
  }

  /**
   * Gets all files matching pattern
   */
  static getAllFilesInDirectory(
    directory: string,
    config: RuleOfCodeConfig,
    filter?: (path: string) => boolean
  ): string[] {
    const files: string[] = [];

    if (!FileUtils.exists(directory)) {
      return files;
    }

    this.recursiveDirectoryScan(directory, config, (path, entry) => {
      if (!entry.isDirectory() && (!filter || filter(path))) {
        files.push(path);
      }
      return false;
    });

    return files;
  }

  /**
   * Counts files in directory structure
   */
  static countFilesRecursive(
    directory: string,
    config: RuleOfCodeConfig,
    filter?: (path: string) => boolean
  ): number {
    let count = 0;

    if (!FileUtils.exists(directory)) {
      return count;
    }

    this.recursiveDirectoryScan(directory, config, (path, entry) => {
      if (!entry.isDirectory()) {
        if (!filter || filter(path)) {
          count++;
        }
      }
      return false;
    });

    return count;
  }

  /**
   * Checks if any file matches predicate in directory tree
   */
  static hasFileMatching(
    directory: string,
    config: RuleOfCodeConfig,
    predicate: (path: string) => boolean
  ): boolean {
    let found = false;

    if (!FileUtils.exists(directory)) {
      return found;
    }

    this.recursiveDirectoryScan(directory, config, (path, entry) => {
      if (!entry.isDirectory() && predicate(path)) {
        found = true;
        return true; // Stop scanning
      }
      return false;
    });

    return found;
  }

  /**
   * Finds first file matching pattern
   */
  static findFirstFile(
    directory: string,
    config: RuleOfCodeConfig,
    predicate: (path: string) => boolean
  ): string | null {
    let foundPath: string | null = null;

    if (!FileUtils.exists(directory)) {
      return foundPath;
    }

    this.recursiveDirectoryScan(directory, config, (path, entry) => {
      if (!entry.isDirectory() && predicate(path)) {
        foundPath = path;
        return true; // Stop scanning
      }
      return false;
    });

    return foundPath;
  }

  /**
   * Maps files to results
   */
  static mapFiles<T>(
    directory: string,
    config: RuleOfCodeConfig,
    mapper: (path: string) => T | null
  ): T[] {
    const results: T[] = [];

    if (!FileUtils.exists(directory)) {
      return results;
    }

    this.recursiveDirectoryScan(directory, config, (path, entry) => {
      if (!entry.isDirectory()) {
        const result = mapper(path);
        if (result !== null) {
          results.push(result);
        }
      }
      return false;
    });

    return results;
  }
}
