/**
 * Glob Pattern Utilities V2.0
 * Professional glob operations with centralized file system access
 * Uses FileSystemOperations for consistent behavior
 */

import { glob } from 'glob';
import type { RuleOfCodeConfig } from '../config/types';
import type { GlobOptions } from '../types/law.types';
import { ConfigFileUtils } from './config-file-utils';
import { DirectoryScanner } from './directory-scanner';
import { FileFilterUtils } from './file-filter-utils';
import {
  createMultiExtensionPattern,
  type FilePatterns,
  getFilePatterns,
  getStandardPatterns,
} from './file-patterns';
import { FileSystemOperations } from './file-system-operations';
import { logError } from './logging-utils';
import { PathOperations } from './path-operations';

export class GlobUtils {
  /**
   * Get glob options for file scanning
   */
  static getGlobOptions(
    projectRoot: string,
    _config: RuleOfCodeConfig,
    lawId?: string
  ): GlobOptions {
    const options: GlobOptions = { cwd: projectRoot };
    options.ignore = FileFilterUtils.getIgnorePatterns(_config, lawId);
    return options;
  }

  /**
   * Create a glob pattern for multiple file extensions
   */
  static createMultiExtensionPattern(extensions: string[]): string {
    return createMultiExtensionPattern(extensions);
  }

  /**
   * Create standard glob patterns for common use cases
   */
  static getStandardPatterns(): ReturnType<typeof getStandardPatterns> {
    return getStandardPatterns();
  }

  /**
   * Get standard file patterns for different file types. One implementation,
   * in file-patterns (which has no internal dependencies); this is its facade.
   */
  static getFilePatterns(): FilePatterns {
    return getFilePatterns();
  }

  /**
   * Get all files in workspace using glob patterns
   */
  static async getFilesInWorkspace(
    workspaceRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): Promise<string[]> {
    const options = this.getGlobOptions(workspaceRoot, config, lawId);

    try {
      const files = await glob([this.getStandardPatterns().allFiles], options);
      return files.filter(file => {
        const fullPath = PathOperations.join(workspaceRoot, file);
        return FileSystemOperations.isFile(fullPath);
      });
    } catch (_error) {
      logError(
        'Error scanning workspace files',
        'GlobUtils.getFilesInWorkspace',
        _error
      );
      return [];
    }
  }

  /**
   * Get files with specific glob patterns
   */
  static async getFiles(
    patterns: string[],
    options: GlobOptions
  ): Promise<string[]> {
    try {
      const allFiles: string[] = [];
      for (const pattern of patterns) {
        const files = await glob(pattern, options);
        allFiles.push(...files);
      }
      return Array.from(new Set(allFiles)); // Remove duplicates
    } catch (_error) {
      logError(
        'Error getting files with patterns',
        'GlobUtils.getFiles',
        _error
      );
      return [];
    }
  }

  /**
   * Find files in directory recursively
   * Now uses centralized FileSystemOperations
   */
  static async findFilesInDirectory(
    directory: string,
    filename: string
  ): Promise<string[]> {
    const foundFiles: string[] = [];

    const scan = async (dirPath: string): Promise<void> => {
      if (!FileSystemOperations.isDirectory(dirPath)) return;

      try {
        const entries = DirectoryScanner.safeReadDirectory(
          dirPath,
          ConfigFileUtils.getMinimalDefaultConfig()
        );

        for (const entry of entries) {
          const fullPath = PathOperations.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.name === filename) {
            foundFiles.push(fullPath);
          }
        }
      } catch (_error) {
        // Ignore directories we can't read
      }
    };

    await scan(directory);
    return foundFiles;
  }

  /**
   * @deprecated Use DirectoryScanner.scanForFiles instead
   * Find files synchronously with patterns - internal method
   */
  static findFilesSyncInternal(
    directory: string,
    pattern: string,
    config: RuleOfCodeConfig
  ): string[] {
    try {
      const { globSync } = require('glob');
      const files = globSync(pattern, {
        cwd: directory,
        absolute: true,
        ignore: config.ignorePatterns ?? [],
      });
      return files.filter((file: string) => FileSystemOperations.isFile(file));
    } catch (_error) {
      logError(
        'Error in findFilesSyncInternal',
        'GlobUtils.findFilesSyncInternal',
        _error
      );
      return [];
    }
  }

  /**
   * @deprecated Use DirectoryScanner.scanForDirectories instead
   * Find directories synchronously - internal method
   */
  static findDirectoriesSyncInternal(
    rootPath: string,
    config: RuleOfCodeConfig,
    _lawId?: string
  ): string[] {
    try {
      const { globSync } = require('glob');
      const dirs = globSync(this.getStandardPatterns().allDirectories, {
        cwd: rootPath,
        absolute: true,
        ignore: config.ignorePatterns ?? [],
      });
      return dirs.filter((dir: string) =>
        FileSystemOperations.isDirectory(dir)
      );
    } catch (_error) {
      logError(
        'Error in findDirectoriesSyncInternal',
        'GlobUtils.findDirectoriesSyncInternal',
        _error
      );
      return [];
    }
  }
}
