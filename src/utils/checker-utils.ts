import type { RuleOfCodeConfig } from '../types';
import { COMMON_EXTENSIONS } from './common-extensions';
import { DirectoryScanner } from './directory-scanner';
import { FileFilterUtils } from './file-filter-utils';

// Re-export for backwards compatibility
export { COMMON_EXTENSIONS };

/**
 * Professional Checker Utilities V2.0
 * Optimized with centralized DirectoryScanner and zero code duplication
 */
export class CheckerUtils {
  /**
   * Safely read directory contents with config-based filtering
   * Now uses centralized DirectoryScanner
   */
  static safeReadDir(
    dirPath: string,
    config: RuleOfCodeConfig,
    lawId?: string,
    _projectRoot?: string
  ): string[] {
    // Use centralized scanner for consistent behavior
    const entries = DirectoryScanner.safeReadDirectory(dirPath, config, lawId);
    return entries.map(entry => entry.name);
  }

  /**
   * Recursively find files by extension with proper config filtering
   * Now uses optimized DirectoryScanner
   */
  static findFilesByExtension(
    rootPath: string,
    extensions: string[],
    config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): string[] {
    // Use centralized scanner - much simpler and more reliable
    return DirectoryScanner.scanForFiles(
      rootPath,
      config,
      extensions,
      lawId,
      includeTests
    );
  }

  /**
   * Find all directories recursively with proper filtering
   * Now uses centralized DirectoryScanner
   */
  static findDirectories(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    return DirectoryScanner.scanForDirectories(rootPath, config, lawId);
  }

  /**
   * Check if file should be processed based on config
   */
  static shouldProcessFile(
    filePath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): boolean {
    return !FileFilterUtils.shouldIgnoreFile(filePath, config, lawId);
  }

  // === CONVENIENCE METHODS FOR COMMON EXTENSION PATTERNS ===

  /**
   * Find TypeScript files (most common use case)
   * Optimized shortcut with predefined extensions
   */
  static findTypeScriptFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): string[] {
    return DirectoryScanner.scanForFiles(
      rootPath,
      config,
      [...CheckerUtils.getCommonExtensions().TYPESCRIPT],
      lawId,
      includeTests
    );
  }

  /**
   * Find Angular component files (.ts, .html, .scss)
   * Specialized for Angular law checkers
   */
  static findAngularFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    return DirectoryScanner.scanForFiles(
      rootPath,
      config,
      [...CheckerUtils.getCommonExtensions().ANGULAR],
      lawId
    );
  }

  /**
   * Find configuration files
   * Useful for checking project configuration laws
   */
  static findConfigFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    return DirectoryScanner.scanForFiles(
      rootPath,
      config,
      [...CheckerUtils.getCommonExtensions().CONFIG],
      lawId
    );
  }

  /**
   * Find all code files (TS + JS)
   * Cross-framework code scanning
   */
  static findAllCodeFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    return DirectoryScanner.scanForFiles(
      rootPath,
      config,
      [...CheckerUtils.getCommonExtensions().ALL_CODE],
      lawId
    );
  }

  /**
   * Get common extensions constant for external use
   * Enables consistent extension usage across law checkers
   */
  static getCommonExtensions(): typeof COMMON_EXTENSIONS {
    return COMMON_EXTENSIONS;
  }
}
