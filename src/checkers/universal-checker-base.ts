/**
 * Universal Base Checker
 * Common functionality for all law checkers with proper config support
 */

import type { RuleOfCodeConfig } from '../config/types';
import type { LawResult } from '../types/law.types';
import { CheckerUtils } from '../utils/checker-utils';
import { ConfigFileUtils } from '../utils/config-file-utils';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';

export abstract class UniversalCheckerBase {
  /**
   * Create a standardized law result
   */
  protected static createResult(
    violations: string[],
    lawName: string,
    category: string,
    recommendations: string[],
    fixable = true
  ): LawResult {
    const score =
      violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10);

    return {
      passed: score >= 100,
      message:
        score >= 100
          ? `${lawName} compliance verified`
          : `${violations.length} ${lawName} violations found`,
      details: recommendations,
      violations,
      score,
      fixable,
      fixCommand: recommendations.join('; '),
      suggestions: recommendations,
      config: ConfigFileUtils.getMinimalDefaultConfig(),
    };
  }

  /**
   * Get project root directory
   */
  protected static getProjectRoot(): string {
    return process.cwd();
  }

  /**
   * Extract config from context
   */
  protected static extractConfig(
    _context: string
  ): RuleOfCodeConfig | undefined {
    return FileUtils.getMinimalDefaultConfig();
  }

  /**
   * Get law ID from class name
   */
  protected static getLawId(): string {
    return this.name.toLowerCase().replace(/law$/, '');
  }

  /**
   * Common file utilities with config support
   */
  protected static getUtils(): typeof CheckerUtils {
    return CheckerUtils;
  }

  /**
   * Read file content safely
   */
  protected static readFileContent(filePath: string): string {
    try {
      return FileUtils.readFile(filePath);
    } catch {
      return '';
    }
  }

  /**
   * Check if file exists
   */
  protected static fileExists(filePath: string): boolean {
    try {
      return FileUtils.exists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  protected static directoryExists(dirPath: string): boolean {
    try {
      return (
        (FileUtils.exists(dirPath) &&
          FileUtils.getFileStats(dirPath)?.isDirectory()) ??
        false
      );
    } catch {
      return false;
    }
  }

  /**
   * Get relative path from project root
   */
  protected static getRelativePath(
    filePath: string,
    projectRoot?: string
  ): string {
    const _path = require('path');
    const root = projectRoot ?? this.getProjectRoot();
    return PathOperations.getRelative(root, filePath);
  }
}
