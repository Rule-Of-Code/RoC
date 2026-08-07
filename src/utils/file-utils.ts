import * as path from 'path';
import type { GlobOptions, RuleOfCodeConfig } from '../types/law.types';
import { ConfigFileUtils } from './config-file-utils';
import { DirectoryScanner } from './directory-scanner';
import { FileFilterUtils } from './file-filter-utils';
import { FileSystemOperations } from './file-system-operations';
import { GlobUtils } from './glob-utils';
import { PathOperations } from './path-operations';

/**
 * Main file utilities facade - coordinates specialized utility classes
 * Professional-grade file operations with centralized logic and zero duplication
 *
 * V2.0 - Optimized for performance and code deduplication
 */
export class FileUtils {
  // === CONFIGURATION DELEGATION ===
  static getDefaultConfig = ConfigFileUtils.getDefaultConfig;
  static getMinimalDefaultConfig = ConfigFileUtils.getMinimalDefaultConfig;
  static loadConfig = ConfigFileUtils.loadConfig;
  static findConfig = ConfigFileUtils.findConfig;
  static isValidConfig = ConfigFileUtils.isValidConfig;

  // === DIRECTORY SCANNING DELEGATION (NEW) ===
  static scanDirectory = DirectoryScanner.scanDirectory;
  static scanForFiles = DirectoryScanner.scanForFiles;
  static scanForDirectories = DirectoryScanner.scanForDirectories;
  static scanForTypeScriptFiles = DirectoryScanner.scanForTypeScriptFiles;
  static safeReadDirectory = DirectoryScanner.safeReadDirectory;

  // === GLOB OPERATIONS DELEGATION ===
  static getGlobOptions = GlobUtils.getGlobOptions;
  static getFilesInWorkspace = GlobUtils.getFilesInWorkspace;

  // === FILE FILTERING DELEGATION ===
  static filterFilesByConfig = FileFilterUtils.filterFilesByConfig;
  static getIgnorePatterns = FileFilterUtils.getIgnorePatterns;
  static shouldIgnoreFile = FileFilterUtils.shouldIgnoreFile;
  static applyInclusionFilters = FileFilterUtils.applyInclusionFilters;

  // === FILE SYSTEM OPERATIONS DELEGATION (UPGRADED) ===
  static exists = FileSystemOperations.exists;
  static fileExists = FileSystemOperations.fileExists; // Legacy alias
  static fileExistsSync = FileSystemOperations.exists; // Legacy alias
  static isFile = FileSystemOperations.isFile;
  static isDirectory = FileSystemOperations.isDirectory;
  static getPathInfo = FileSystemOperations.getPathInfo;
  static getFileStats = FileSystemOperations.getFileStats; // Legacy method

  // Reading operations
  static readFile = FileSystemOperations.readFile;
  static readFileSync = FileSystemOperations.readFileSync; // Legacy alias
  static readFileContent = FileSystemOperations.readFileSync; // Legacy alias
  static readFileContentSync = FileSystemOperations.readFileSync; // Legacy alias
  static readJsonFile = FileSystemOperations.readJsonFile;
  static readFileLines = FileSystemOperations.readFileLines;

  // Writing operations
  static writeFile = FileSystemOperations.writeFile;
  static writeFileSync = FileSystemOperations.writeFileSync; // Legacy alias

  // Directory operations
  static createDirectory = FileSystemOperations.createDirectory;
  static createParentDirectories = FileSystemOperations.createParentDirectories;
  static createTempDirectory = FileSystemOperations.createTempDirectory;

  // File operations
  static copyFile = FileSystemOperations.copyFile;
  static moveFile = FileSystemOperations.moveFile;
  static deleteFile = FileSystemOperations.deleteFile;
  static deleteDirectory = FileSystemOperations.deleteDirectory;

  // File info
  static getFileSize = FileSystemOperations.getFileSize;
  static getFileExtension = (filePath: string): string =>
    PathOperations.getExtension(filePath).toLowerCase();
  static getModificationTime = FileSystemOperations.getModificationTime;
  static isFileNewer = FileSystemOperations.isFileNewer;

  // === PATH OPERATIONS DELEGATION (UPGRADED) ===
  static normalize = PathOperations.normalize;
  static normalizePath = PathOperations.normalize; // Legacy alias
  static join = path.join;
  static joinPaths = path.join; // Legacy alias
  static resolve = PathOperations.resolve;
  static isAbsolute = PathOperations.isAbsolute;
  static isAbsolutePath = PathOperations.isAbsolute; // Legacy alias
  static getRelative = path.relative;
  static getRelativePath = path.relative; // Legacy alias
  static getWorkspaceRelative = PathOperations.getWorkspaceRelative;

  // Path components
  static parse = PathOperations.parse;
  static getDirectory = PathOperations.getDirectory;
  static getParentDirectory = PathOperations.getParent; // Updated
  static getFilename = PathOperations.getFilename;
  static getBasename = PathOperations.getBasename;
  static getExtension = path.extname;

  // Path modification
  static changeExtension = PathOperations.changeExtension;
  static addSuffix = PathOperations.addSuffix;
  static addPrefix = PathOperations.addPrefix;

  // Path validation
  static hasExtension = PathOperations.hasExtension;
  static isInDirectory = PathOperations.isInDirectory;
  static matchesPattern = PathOperations.matchesPattern;

  // === LEGACY METHODS (DEPRECATED - Use newer equivalents) ===

  /**
   * @deprecated Use scanForFiles instead
   */
  static async findFilesInDirectory(
    directory: string,
    filename: string
  ): Promise<string[]> {
    return GlobUtils.findFilesInDirectory(directory, filename);
  }

  /**
   * @deprecated Use PathOperations.findWorkspaceRoot with FileSystemOperations
   */
  static findWorkspaceRoot(startDir: string): string {
    return ConfigFileUtils.findWorkspaceRoot(startDir);
  }

  /**
   * @deprecated Use GlobUtils.getFiles instead
   */
  static async getFiles(
    patterns: string[],
    options: GlobOptions
  ): Promise<string[]> {
    return GlobUtils.getFiles(patterns, options);
  }

  /**
   * @deprecated Use scanForTypeScriptFiles instead
   */
  static getAllTypeScriptFiles(
    directory: string,
    config: RuleOfCodeConfig,
    lawId?: string,
    includeTests?: boolean
  ): string[] {
    return DirectoryScanner.scanForTypeScriptFiles(
      directory,
      config,
      includeTests,
      lawId
    );
  }

  /**
   * @deprecated Use scanForFiles instead
   */
  static findFilesSync(
    directory: string,
    config: RuleOfCodeConfig,
    pattern?: string
  ): string[] {
    // Extract extensions from pattern if provided
    let extensions: string[] = [];
    if (pattern) {
      // Handle patterns like GlobUtils.getFilePatterns().typescript or "**/*.{ts,js}"
      const extMatch = pattern.match(/\*\.(\w+|\{[^}]+\})$/);
      if (extMatch?.[1]) {
        const extPart = extMatch[1];
        if (extPart.startsWith('{') && extPart.endsWith('}')) {
          // Handle {ts,js} format
          extensions = extPart
            .slice(1, -1)
            .split(',')
            .map(ext => `.${ext.trim()}`);
        } else {
          // Handle single extension
          extensions = [`.${extPart}`];
        }
      }
    }

    return DirectoryScanner.scanForFiles(directory, config, extensions);
  }

  /**
   * @deprecated Use scanForDirectories instead
   */
  static getAllDirectories(
    rootPath: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    return DirectoryScanner.scanForDirectories(rootPath, config, lawId);
  }
}
