/**
 * Pattern Search Utility
 * Consolidates duplicate file scanning and pattern matching logic
 */

import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

export class PatternSearchUtility {
  /**
   * Safely reads file content and tests against patterns
   * Common helper for pattern matching
   */
  private static readFileContent(filePath: string): string | null {
    try {
      if (!FileUtils.exists(filePath)) {
        return null;
      }
      return FileUtils.readFile(filePath, { encoding: 'utf8' });
    } catch (_error) {
      return null;
    }
  }

  /**
   * Checks if a file matches any of the given patterns (internal helper)
   */
  private static fileMatchesPatterns(
    filePath: string,
    patterns: RegExp[]
  ): boolean {
    const content = this.readFileContent(filePath);
    return content ? patterns.some(pattern => pattern.test(content)) : false;
  }

  /**
   * Searches multiple files for matching patterns
   * Returns true if any file matches any pattern
   */
  static searchFilesForPatterns(
    projectRoot: string,
    searchFiles: string[],
    patterns: RegExp[]
  ): boolean {
    for (const searchFile of searchFiles) {
      const filePath = PathOperations.join(projectRoot, searchFile);
      if (this.fileMatchesPatterns(filePath, patterns)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds files matching patterns
   * Returns list of files that match at least one pattern
   */
  static findFilesMatchingPatterns(
    projectRoot: string,
    searchFiles: string[],
    patterns: RegExp[]
  ): string[] {
    const matches: string[] = [];

    for (const searchFile of searchFiles) {
      const filePath = PathOperations.join(projectRoot, searchFile);
      if (this.fileMatchesPatterns(filePath, patterns)) {
        matches.push(searchFile);
      }
    }

    return matches;
  }

  /**
   * Counts files matching patterns
   */
  static countFilesMatchingPatterns(
    projectRoot: string,
    searchFiles: string[],
    patterns: RegExp[]
  ): number {
    return this.findFilesMatchingPatterns(projectRoot, searchFiles, patterns)
      .length;
  }

  /**
   * Extracts matches from files
   */
  static extractMatches(
    filePath: string,
    pattern: RegExp,
    global = true
  ): string[] {
    try {
      if (!FileUtils.exists(filePath)) {
        return [];
      }

      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });

      if (global) {
        const matches: string[] = [];
        let match;
        const globalPattern = new RegExp(pattern.source, `${pattern.flags  }g`);
        while ((match = globalPattern.exec(content)) !== null) {
          matches.push(match[0]);
        }
        return matches;
      } else {
        const match = pattern.exec(content);
        return match ? [match[0]] : [];
      }
    } catch (_error) {
      return [];
    }
  }

  /**
   * Searches for pattern in multiple files and returns all matches
   */
  static searchMultipleFilesForMatches(
    projectRoot: string,
    searchFiles: string[],
    pattern: RegExp
  ): Map<string, string[]> {
    const results = new Map<string, string[]>();

    for (const searchFile of searchFiles) {
      const filePath = PathOperations.join(projectRoot, searchFile);
      const matches = this.extractMatches(filePath, pattern);

      if (matches.length > 0) {
        results.set(searchFile, matches);
      }
    }

    return results;
  }

  /**
   * Checks if file content matches all patterns (AND operation)
   */
  static fileMatchesAllPatterns(filePath: string, patterns: RegExp[]): boolean {
    const content = this.readFileContent(filePath);
    return content ? patterns.every(pattern => pattern.test(content)) : false;
  }

  /**
   * Common pattern sets for health checks
   */
  static readonly HEALTH_CHECK_PATTERNS = {
    database: [/database.*health/i, /db.*alive/i, /database.*alive/i],
    externalService: [
      /api.*health/i,
      /external.*service/i,
      /api.*dependency/i,
      /upstream.*health/i,
    ],
    kubernetes: [
      /liveness.*probe/i,
      /readiness.*probe/i,
      /startup.*probe/i,
      /kubernetes.*health/i,
    ],
    performance: [
      /response.*time/i,
      /latency/i,
      /throughput/i,
      /performance.*metrics/i,
    ],
  };
}
