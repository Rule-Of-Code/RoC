/**
 * Directory Scanner Utility
 */

import type { RuleOfCodeConfig } from '../config/types';
import { PathOperations } from '../utils/path-operations';
import { FileFilterUtils } from './file-filter-utils';
import { FileSystemOperations } from './file-system-operations';
export interface ScanOptions {
  /** Extensions to include (e.g., CheckerUtils.getCommonExtensions().ALL_CODE) */
  extensions?: string[];
  /** Include hidden files/directories */
  includeHidden?: boolean;
  /** Maximum depth to scan (default: unlimited) */
  maxDepth?: number;
  /** Apply config-based filtering */
  useConfigFiltering?: boolean;
  /** Law ID for specific filtering */
  lawId?: string;
  /** Only scan directories, not files */
  directoriesOnly?: boolean;
  /** Only scan files, not directories */
  filesOnly?: boolean;
  /** Include test files (.spec.ts, .test.ts) - by default they are excluded */
  includeTests?: boolean;
}

export interface ScanResult {
  files: string[];
  directories: string[];
  errors: Array<{ path: string; error: string }>;
}

/**
 * Professional directory scanner with centralized logic
 * Eliminates code duplication across 20+ analyzer files
 */
export class DirectoryScanner {
  /**
   * Scan directory recursively with comprehensive options
   */
  static scanDirectory(
    rootPath: string,
    config: RuleOfCodeConfig,
    options: ScanOptions = {}
  ): ScanResult {
    const result: ScanResult = {
      files: [],
      directories: [],
      errors: [],
    };

    DirectoryScanner.scanDirectoryRecursive({
      currentPath: rootPath,
      rootPath,
      config,
      options,
      result,
      currentDepth: 0,
    });
    return result;
  }

  /**
   * Quick scan for files with specific extensions
   */
  static scanForFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    extensions: string[],
    lawId?: string,
    includeTests = false
  ): string[] {
    const options: ScanOptions = {
      extensions,
      filesOnly: true,
      useConfigFiltering: true,
      lawId,
      includeTests,
    };

    return this.scanDirectory(rootPath, config, options).files;
  }

  /**
   * Quick scan for directories only
   */
  static scanForDirectories(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    const options: ScanOptions = {
      directoriesOnly: true,
      useConfigFiltering: true,
      lawId,
    };

    return this.scanDirectory(rootPath, config, options).directories;
  }

  /**
   * Scan for TypeScript files specifically (most common use case)
   */
  static scanForTypeScriptFiles(
    rootPath: string,
    config: RuleOfCodeConfig,
    includeTests = false,
    lawId?: string
  ): string[] {
    const options: ScanOptions = {
      extensions: ['.ts', '.tsx'],
      filesOnly: true,
      useConfigFiltering: true,
      lawId,
      includeTests,
    };

    return this.scanDirectory(rootPath, config, options).files;
  }

  /**
   * Safe directory read with error handling
   */
  static safeReadDirectory(
    dirPath: string,
    config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): Array<{
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
  }> {
    try {
      // Check if directory should be ignored
      if (
        DirectoryScanner.shouldIgnoreDirectory(
          dirPath,
          config,
          lawId,
          includeTests
        )
      ) {
        return [];
      }

      return FileSystemOperations.readDirectory(dirPath);
    } catch (error) {
      console.warn(`⚠️ Cannot read directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Internal recursive scanning implementation
   */
  private static scanDirectoryRecursive(params: {
    currentPath: string;
    rootPath: string;
    config: RuleOfCodeConfig;
    options: ScanOptions;
    result: ScanResult;
    currentDepth: number;
  }): void {
    const { currentPath, rootPath, config, options, result, currentDepth } =
      params;

    // Check depth limit
    if (options.maxDepth !== undefined && currentDepth > options.maxDepth) {
      return;
    }

    // Check if path should be ignored
    if (options.useConfigFiltering) {
      const relativePath = PathOperations.getRelative(rootPath, currentPath);
      if (
        FileFilterUtils.shouldIgnoreFile(
          relativePath,
          config,
          options.lawId,
          options.includeTests
        )
      ) {
        return;
      }
    }

    try {
      const entries = FileSystemOperations.readDirectory(currentPath);

      for (const entry of entries) {
        const fullPath = PathOperations.join(currentPath, entry.name);

        // Skip hidden files/directories unless explicitly included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        if (entry.isDirectory()) {
          this.processDirectory({
            fullPath,
            rootPath,
            config,
            options,
            result,
            currentDepth,
          });
        } else if (entry.isFile()) {
          this.processFile({
            fullPath,
            rootPath,
            config,
            options,
            result,
            fileName: entry.name,
          });
        }
      }
    } catch (error) {
      result.errors.push({
        path: currentPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private static processDirectory(params: {
    fullPath: string;
    rootPath: string;
    config: RuleOfCodeConfig;
    options: ScanOptions;
    result: ScanResult;
    currentDepth: number;
  }): void {
    const { fullPath, rootPath, config, options, result, currentDepth } =
      params;

    // Check depth limit
    if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
      return;
    }

    const relativePath = PathOperations.getRelative(rootPath, fullPath);

    // Add directory to results if requested
    if (
      !options.filesOnly &&
      this.shouldIncludeFile(relativePath, config, options)
    ) {
      result.directories.push(fullPath);
    }

    // Recursively scan subdirectory
    DirectoryScanner.scanDirectoryRecursive({
      currentPath: fullPath,
      rootPath,
      config,
      options,
      result,
      currentDepth: currentDepth + 1,
    });
  }

  private static processFile(params: {
    fullPath: string;
    rootPath: string;
    config: RuleOfCodeConfig;
    options: ScanOptions;
    result: ScanResult;
    fileName: string;
  }): void {
    const { fullPath, rootPath, config, options, result } = params;
    const relativePath = PathOperations.getRelative(rootPath, fullPath);

    // Add file to results if requested
    const matchesExtensions =
      !options.extensions ||
      options.extensions.length === 0 ||
      PathOperations.hasExtension(fullPath, options.extensions);

    if (
      !options.directoriesOnly &&
      matchesExtensions &&
      this.shouldIncludeFile(relativePath, config, options)
    ) {
      result.files.push(fullPath);
    }
  }

  private static shouldIncludeFile(
    relativePath: string,
    config: RuleOfCodeConfig,
    options: ScanOptions
  ): boolean {
    return (
      !options.useConfigFiltering ||
      !FileFilterUtils.shouldIgnoreFile(
        relativePath,
        config,
        options.lawId,
        options.includeTests
      )
    );
  }

  /**
   * Check if directory should be ignored
   */
  private static shouldIgnoreDirectory(
    dirPath: string,
    config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): boolean {
    // Quick check for common ignored directories
    const dirName = PathOperations.getBasename(dirPath);
    if (['node_modules', '.git', 'dist', '.nx', '.angular'].includes(dirName)) {
      return true;
    }

    // Use config-based filtering
    return FileFilterUtils.shouldIgnoreFile(
      dirPath,
      config,
      lawId,
      includeTests
    );
  }
}
