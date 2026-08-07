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
   * Create glob patterns for specific file types
   */
  static createTypePattern(
    type: 'config' | 'javascript' | 'markdown' | 'test' | 'typescript'
  ): string[] {
    const typeExtensions = {
      typescript: ['ts', 'tsx'],
      javascript: ['js', 'jsx'],
      config: ['json', 'yaml', 'yml'],
      test: ['test.*', 'spec.*'],
      markdown: ['md', 'markdown'],
    };

    const extensions = typeExtensions[type];

    if (type === 'test') {
      // Special handling for test patterns
      return [
        `**/*.${extensions[0]}`,
        `**/*.${extensions[1]}`,
        '**/test/**',
        '**/tests/**',
      ];
    }

    return extensions.map(ext => `**/*.${ext}`);
  }

  /**
   * Create a glob pattern for multiple file extensions
   */
  static createMultiExtensionPattern(extensions: string[]): string {
    if (extensions.length === 1) {
      return `**/*.${extensions[0]}`;
    }
    return `**/*.{${extensions.join(',')}}`;
  }

  /**
   * Create standard glob patterns for common use cases
   */
  static getStandardPatterns(): {
    allFiles: string;
    allDirectories: string;
    allFilesAndDirectories: string;
  } {
    return {
      allFiles: '**/*',
      allDirectories: '**/',
      allFilesAndDirectories: '**',
    };
  }

  /**
   * Get standard file patterns for different file types
   */
  static getFilePatterns(): {
    typescript: string[];
    javascript: string[];
    config: string[];
    test: string[];
    markdown: string[];
  } {
    return {
      typescript: this.createTypePattern('typescript'),
      javascript: this.createTypePattern('javascript'),
      config: this.createTypePattern('config'),
      test: this.createTypePattern('test'),
      markdown: this.createTypePattern('markdown'),
    };
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
