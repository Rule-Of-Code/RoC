/**
 * Centralized File System Operations Utility
 * Professional file system operations with error handling and performance optimization
 * Replaces scattered fs operations across the codebase
 */

import * as fs from 'fs';
import { PathOperations } from '../utils/path-operations';
export interface FileReadOptions {
  /** File encoding (default: utf8) */
  encoding?: BufferEncoding;
  /** Return empty string on error instead of throwing */
  fallbackToEmpty?: boolean;
  /** Log errors to console */
  logErrors?: boolean;
}

export interface FileWriteOptions {
  /** File encoding (default: utf8) */
  encoding?: BufferEncoding;
  /** Create parent directories if they don't exist */
  createDirs?: boolean;
  /** Log operations to console */
  logOperations?: boolean;
}

export interface PathInfo {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  extension?: string;
}

/**
 * Professional file system operations utility
 * Eliminates code duplication across 40+ files
 */
export class FileSystemOperations {
  // === EXISTENCE CHECKS ===

  /**
   * Check if path exists (file or directory)
   * Replaces scattered fs.existsSync calls
   */
  static exists(filePath: string): boolean {
    try {
      fs.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Legacy compatibility method - matches original FileOperationsUtils API
   */
  static fileExists(filePath: string): boolean {
    return this.exists(filePath);
  }

  /**
   * Check if path exists and is a file
   */
  static isFile(filePath: string): boolean {
    return this.getFileStats(filePath)?.isFile() ?? false;
  }

  /**
   * Check if path exists and is a directory
   */
  static isDirectory(dirPath: string): boolean {
    return this.getFileStats(dirPath)?.isDirectory() ?? false;
  }

  /**
   * Get comprehensive path information
   */
  static getPathInfo(filePath: string): PathInfo {
    const info: PathInfo = {
      exists: false,
      isFile: false,
      isDirectory: false,
    };

    const stats = this.getFileStats(filePath);
    if (stats) {
      info.exists = true;
      info.isFile = stats.isFile();
      info.isDirectory = stats.isDirectory();
      info.size = stats.size;
      info.modified = stats.mtime;
      info.extension = PathOperations.getExtension(filePath).toLowerCase();
    }

    return info;
  }

  /**
   * Legacy compatibility method - matches original FileOperationsUtils API
   */
  static getFileStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  // === FILE READING ===

  /**
   * Read file content with comprehensive error handling
   * Replaces scattered fs.readFileSync calls
   */
  static readFile(filePath: string, options: FileReadOptions = {}): string {
    const {
      encoding = 'utf8',
      fallbackToEmpty = true,
      logErrors = false,
    } = options;

    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      if (logErrors) {
        console.warn(`⚠️ Failed to read file ${filePath}:`, error);
      }

      if (fallbackToEmpty) {
        return '';
      }

      throw error;
    }
  }

  /**
   * Legacy compatibility method - matches original FileOperationsUtils API
   */
  static readFileSync(
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): string {
    return this.readFile(filePath, { encoding });
  }

  /**
   * Read JSON file with parsing
   */
  static readJsonFile<T = unknown>(filePath: string, fallbackValue?: T): T {
    try {
      const content = this.readFile(filePath, { fallbackToEmpty: false });
      // Windows editors/PowerShell often prepend a UTF-8 BOM, which JSON.parse rejects
      return JSON.parse(content.replace(/^\uFEFF/, '')) as T;
    } catch (error) {
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw error;
    }
  }

  /**
   * Read a JSONC file: JSON with line and block comments and trailing commas.
   *
   * tsconfig.json is officially JSONC \u2014 comments and trailing commas are valid,
   * and every editor's default tsconfig has them. Parsing it with plain JSON.parse
   * throws, and a caller that swallows the throw then treats "unparseable" as "no
   * config" \u2014 which is how TypeScript Strict Mode silently PASSED a tsconfig it
   * never actually read (a disarmed gate). Use this for tsconfig; keep readJsonFile
   * (strict) for package.json, where comments are genuinely invalid.
   */
  static readJsoncFile<T = unknown>(filePath: string, fallbackValue?: T): T {
    try {
      const content = this.readFile(filePath, { fallbackToEmpty: false });
      const stripped = this.stripJsonComments(content.replace(/^\uFEFF/, ''));
      return JSON.parse(stripped) as T;
    } catch (error) {
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw error;
    }
  }

  /**
   * Remove `//` and block comments and trailing commas, respecting string
   * literals so a `//` or `,` inside a value is never touched. Two passes: strip
   * comments first, then trailing commas, so a comment between a comma and its
   * closing brace does not leave the comma stranded.
   */
  static stripJsonComments(input: string): string {
    let out = '';
    let i = 0;
    while (i < input.length) {
      const c = input[i];
      const next = input[i + 1];
      if (c === '"') {
        const end = this.endOfString(input, i);
        out += input.slice(i, end);
        i = end;
      } else if (c === '/' && next === '/') {
        i = this.skipLineComment(input, i);
      } else if (c === '/' && next === '*') {
        i = this.skipBlockComment(input, i);
      } else {
        out += c;
        i++;
      }
    }
    return this.stripTrailingCommas(out);
  }

  /** Index just past a `//` line comment starting at `start`. */
  private static skipLineComment(input: string, start: number): number {
    let i = start + 2;
    while (i < input.length && input[i] !== '\n') i++;
    return i;
  }

  /** Index just past the closing of a block comment starting at `start`. */
  private static skipBlockComment(input: string, start: number): number {
    let i = start + 2;
    while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
    return i + 2;
  }

  private static stripTrailingCommas(input: string): string {
    let out = '';
    let i = 0;
    while (i < input.length) {
      const c = input[i];
      if (c === '"') {
        const end = this.endOfString(input, i);
        out += input.slice(i, end);
        i = end;
      } else if (c === ',' && this.isTrailingComma(input, i)) {
        i++; // drop it
      } else {
        out += c;
        i++;
      }
    }
    return out;
  }

  /** From an opening quote at `start`, the index just past its closing quote. */
  private static endOfString(input: string, start: number): number {
    let i = start + 1;
    while (i < input.length) {
      if (input[i] === '\\') {
        i += 2;
        continue;
      }
      if (input[i] === '"') return i + 1;
      i++;
    }
    return i;
  }

  /** Is the comma at `commaIndex` immediately followed (past whitespace) by } or ]? */
  private static isTrailingComma(input: string, commaIndex: number): boolean {
    let j = commaIndex + 1;
    while (j < input.length && /\s/.test(input[j] as string)) j++;
    return input[j] === '}' || input[j] === ']';
  }

  /**
   * Read file lines as array
   */
  static readFileLines(
    filePath: string,
    options: FileReadOptions = {}
  ): string[] {
    const content = this.readFile(filePath, options);
    return content.split(/\r?\n/);
  }

  // === FILE WRITING ===

  /**
   * Write content to file with comprehensive options
   * Replaces scattered fs.writeFileSync calls
   */
  static writeFile(
    filePath: string,
    content: string,
    options: FileWriteOptions = {}
  ): void {
    const {
      encoding = 'utf8',
      createDirs = true,
      logOperations = false,
    } = options;

    try {
      if (createDirs) {
        this.createParentDirectories(filePath);
      }

      fs.writeFileSync(filePath, content, encoding);

      if (logOperations) {
        console.log(`✓ Written file: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Legacy compatibility method - matches original FileOperationsUtils API
   */
  static writeFileSync(
    filePath: string,
    content: string,
    encoding: BufferEncoding = 'utf8'
  ): void {
    this.writeFile(filePath, content, { encoding, createDirs: true });
  }

  /**
   * Write JSON object to file
   */
  static writeJsonFile(
    filePath: string,
    data: unknown,
    options: FileWriteOptions = {}
  ): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.writeFile(filePath, jsonContent, options);
  }

  /**
   * Append content to file
   */
  static appendToFile(
    filePath: string,
    content: string,
    options: FileWriteOptions = {}
  ): void {
    const { encoding = 'utf8', createDirs = true } = options;

    try {
      if (createDirs) {
        this.createParentDirectories(filePath);
      }

      fs.appendFileSync(filePath, content, encoding);
    } catch (error) {
      console.error(`❌ Failed to append to file ${filePath}:`, error);
      throw error;
    }
  }

  // === DIRECTORY OPERATIONS ===

  /**
   * Create a temporary directory with a prefix
   * Replaces scattered fs.mkdtempSync calls
   */
  static createTempDirectory(prefix: string): string {
    const os = require('os');
    return fs.mkdtempSync(PathOperations.join(os.tmpdir(), prefix));
  }

  /**
   * Create directory recursively
   * Replaces scattered fs.mkdirSync calls
   */
  static createDirectory(dirPath: string, logOperations = false): void {
    try {
      if (!this.exists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });

        if (logOperations) {
          console.log(`✓ Created directory: ${dirPath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Create parent directories for a file path
   */
  static createParentDirectories(filePath: string): void {
    const parentDir = PathOperations.getDirectory(filePath);
    if (parentDir && !this.exists(parentDir)) {
      this.createDirectory(parentDir);
    }
  }

  // === FILE OPERATIONS ===

  /**
   * Copy file with error handling
   */
  static copyFile(
    source: string,
    destination: string,
    createDirs = true
  ): void {
    try {
      if (createDirs) {
        this.createParentDirectories(destination);
      }

      fs.copyFileSync(source, destination);
    } catch (error) {
      console.error(`❌ Failed to copy ${source} to ${destination}:`, error);
      throw error;
    }
  }

  /**
   * Move/rename file
   */
  static moveFile(
    source: string,
    destination: string,
    createDirs = true
  ): void {
    try {
      if (createDirs) {
        this.createParentDirectories(destination);
      }

      fs.renameSync(source, destination);
    } catch (error) {
      console.error(`❌ Failed to move ${source} to ${destination}:`, error);
      throw error;
    }
  }

  /**
   * Delete file if it exists
   */
  static deleteFile(filePath: string, logOperations = false): void {
    try {
      if (this.exists(filePath)) {
        fs.unlinkSync(filePath);

        if (logOperations) {
          console.log(`✓ Deleted file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete directory recursively
   */
  static deleteDirectory(dirPath: string, logOperations = false): void {
    try {
      if (this.exists(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });

        if (logOperations) {
          console.log(`✓ Deleted directory: ${dirPath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to delete directory ${dirPath}:`, error);
      throw error;
    }
  }

  // === PATH UTILITIES ===

  /**
   * Get file size in bytes
   */
  static getFileSize(filePath: string): number {
    return this.getFileStats(filePath)?.size ?? 0;
  }

  /**
   * Get file modification time
   */
  static getModificationTime(filePath: string): Date | null {
    return this.getFileStats(filePath)?.mtime ?? null;
  }

  /**
   * Check if file is newer than another file
   */
  static isFileNewer(file1: string, file2: string): boolean {
    const mtime1 = this.getModificationTime(file1);
    const mtime2 = this.getModificationTime(file2);

    if (!mtime1 || !mtime2) return false;
    return mtime1 > mtime2;
  }

  // === BATCH OPERATIONS ===

  /**
   * Find files matching patterns in directories
   */
  static findFiles(directories: string[], extensions: string[]): string[] {
    const foundFiles: string[] = [];

    for (const dir of directories) {
      if (!this.isDirectory(dir)) continue;

      this.processDirectoryForFiles(dir, extensions, foundFiles);
    }

    return foundFiles;
  }

  /**
   * Helper method to process a directory for file finding
   */
  private static processDirectoryForFiles(
    dir: string,
    extensions: string[],
    foundFiles: string[]
  ): void {
    const entries = this.readDirectory(dir);

    for (const entry of entries) {
      this.processEntryForFiles(entry, dir, extensions, foundFiles);
    }
  }

  /**
   * Helper method to process a directory entry for file finding
   */
  private static processEntryForFiles(
    entry: fs.Dirent,
    dir: string,
    extensions: string[],
    foundFiles: string[]
  ): void {
    if (!entry.isFile()) return;

    const fullPath = PathOperations.join(dir, entry.name);
    const ext = PathOperations.getExtension(entry.name).toLowerCase();

    if (extensions.length === 0 || extensions.includes(ext)) {
      foundFiles.push(fullPath);
    }
  }

  /**
   * Read directory entries with error handling
   * Centralized method to replace direct fs.readdirSync calls
   */
  static readDirectory(dirPath: string): fs.Dirent[] {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }
  }

  /**
   * Get disk usage for a directory
   */
  static getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    const entries = this.readDirectory(dirPath);

    for (const entry of entries) {
      const fullPath = PathOperations.join(dirPath, entry.name);

      if (entry.isFile()) {
        totalSize += this.getFileSize(fullPath);
      } else if (entry.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      }
    }

    return totalSize;
  }
}
