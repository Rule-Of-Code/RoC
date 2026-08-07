import { ANGULAR_CONSTANTS, NGRX_KEYWORDS } from '../constants';
import { FileSystemOperations } from '../file-system-operations';
import { PatternMatchingUtils } from '../pattern-matching-utils';
import { NgRxPathOperations } from './ngrx-path-operations';

/**
 * NgRx DevTools Checker
 * SRP: Responsible only for checking NgRx DevTools configuration
 */
export class NgRxDevToolsChecker {
  /**
   * DevTools patterns for configuration detection
   */
  static readonly DEVTOOLS_PATTERNS = [
    NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE,
    'provideStoreDevtools',
    'store-devtools',
  ] as readonly string[];

  /**
   * File reading configuration - RULE 2: Uses centralized constants
   */
  private static readonly FILE_CONFIG = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
    fallbackToEmpty: true,
  } as const;

  /**
   * RULE 2: Helper for safe file content reading
   * Eliminates repeated file reading logic
   */
  private static readConfigFile(filePath: string): string | null {
    if (!FileSystemOperations.exists(filePath)) {
      return null;
    }
    return FileSystemOperations.readFile(filePath, this.FILE_CONFIG);
  }

  /**
   * RULE 2: Helper for DevTools pattern detection in content
   * Centralizes pattern matching logic
   */
  private static hasDevToolsPatterns(content: string): boolean {
    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    return PatternMatchingUtils.hasAnyPattern(content, this.DEVTOOLS_PATTERNS);
  }

  /**
   * Check if DevTools is configured in app config files
   * RULE 1 & RULE 2: Optimized with helper methods and centralized utilities
   */
  static checkDevToolsConfigured(projectRoot: string): boolean {
    const configPaths = NgRxPathOperations.getDevToolsConfigPaths(projectRoot);

    // RULE 2: Use helper method for cleaner iteration logic
    for (const configPath of configPaths) {
      const content = this.readConfigFile(configPath);
      if (content && this.hasDevToolsPatterns(content)) {
        return true;
      }
    }

    return false;
  }
}
