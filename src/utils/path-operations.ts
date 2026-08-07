/**
 * Professional Path Operations Utility
 * Centralized path manipulation with cross-platform compatibility
 * Replaces scattered path operations across 50+ files
 */

import * as path from 'path';

export interface PathComponents {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
}

export interface RelativePathOptions {
  /** Use forward slashes even on Windows */
  forceForwardSlashes?: boolean;
  /** Remove leading ./ from relative paths */
  cleanRelative?: boolean;
}

/**
 * Professional path operations utility
 * Eliminates code duplication across 50+ files using path operations
 */
export class PathOperations {
  // === PATH NORMALIZATION ===

  /**
   * Normalize path with consistent forward slashes
   * Replaces scattered path normalization logic
   */
  static normalize(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Filter and validate path segments
   * Internal helper for segment processing
   */
  private static filterSegments(
    segments: Array<string | null | undefined>
  ): string[] {
    return segments
      .filter(segment => segment?.trim())
      .map(segment => (segment as string).trim());
  }

  /**
   * Join multiple path segments safely
   * Replaces scattered path.join calls with validation
   */
  static join(...segments: Array<string | null | undefined>): string {
    const validSegments = this.filterSegments(segments);

    if (validSegments.length === 0) return '';

    return this.normalize(path.join(...validSegments));
  }

  /**
   * Resolve absolute path from segments
   */
  static resolve(...segments: Array<string | null | undefined>): string {
    const validSegments = this.filterSegments(segments);

    if (validSegments.length === 0) return process.cwd();

    return this.normalize(path.resolve(...validSegments));
  }

  // === PATH ANALYSIS ===

  /**
   * Check if path is absolute
   */
  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Get relative path between two locations
   * Replaces scattered path.relative calls
   */
  static getRelative(
    from: string,
    to: string,
    options: RelativePathOptions = {}
  ): string {
    const { forceForwardSlashes = true, cleanRelative = true } = options;

    let relativePath = path.relative(from, to);

    if (forceForwardSlashes) {
      relativePath = this.normalize(relativePath);
    }

    if (cleanRelative && relativePath.startsWith('./')) {
      relativePath = relativePath.slice(2);
    }

    return relativePath;
  }

  /**
   * Get relative path from workspace root
   * Most common operation across analyzers
   */
  static getWorkspaceRelative(filePath: string, workspaceRoot: string): string {
    const normalized = this.normalize(filePath);
    const normalizedRoot = this.normalize(workspaceRoot);

    if (normalized.startsWith(normalizedRoot)) {
      const relative = normalized.slice(normalizedRoot.length);
      return relative.startsWith('/') ? relative.slice(1) : relative;
    }

    return this.getRelative(workspaceRoot, filePath);
  }

  // === PATH COMPONENTS ===

  /**
   * Parse path into components
   */
  static parse(filePath: string): PathComponents {
    const parsed = path.parse(filePath);
    return {
      root: parsed.root,
      dir: this.normalize(parsed.dir),
      base: parsed.base,
      ext: parsed.ext,
      name: parsed.name,
    };
  }

  /**
   * Get directory name from path
   * Replaces scattered path.dirname calls
   */
  static getDirectory(filePath: string): string {
    return this.normalize(path.dirname(filePath));
  }

  /**
   * Get parent directory path
   */
  static getParent(filePath: string): string {
    const dir = this.getDirectory(filePath);
    return dir === filePath ? '' : dir;
  }

  /**
   * Get filename with extension
   * Replaces scattered path.basename calls
   */
  static getFilename(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * Get filename without extension
   */
  static getBasename(filePath: string): string {
    const parsed = path.parse(filePath);
    return parsed.name;
  }

  /**
   * Get file extension
   * Replaces scattered path.extname calls
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Get file extension without dot
   */
  static getExtensionWithoutDot(filePath: string): string {
    const ext = this.getExtension(filePath);
    return ext.startsWith('.') ? ext.slice(1) : ext;
  }

  // === PATH MODIFICATION ===

  /**
   * Change file extension
   */
  static changeExtension(filePath: string, newExt: string): string {
    const parsed = path.parse(filePath);
    const cleanExt = newExt.startsWith('.') ? newExt : `.${newExt}`;
    return this.join(parsed.dir, `${parsed.name}${cleanExt}`);
  }

  /**
   * Add suffix to filename before extension
   */
  static addSuffix(filePath: string, suffix: string): string {
    const parsed = path.parse(filePath);
    return this.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
  }

  /**
   * Add prefix to filename
   */
  static addPrefix(filePath: string, prefix: string): string {
    const parsed = path.parse(filePath);
    return this.join(parsed.dir, `${prefix}${parsed.base}`);
  }

  // === PATH VALIDATION ===

  /**
   * Check if path has specific extension
   */
  static hasExtension(filePath: string, extensions: string[]): boolean {
    const fileExt = this.getExtension(filePath).toLowerCase();
    const lowerPath = filePath.toLowerCase();
    return extensions.some(ext => {
      const cleanExt = (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase();
      // Match a simple extension (".ts") exactly, OR a compound suffix
      // (".reducer.ts", ".component.ts"). getExtension() only returns the final
      // ".ts", so compound extensions must be matched against the full path —
      // otherwise discovery for *.reducer.ts etc. finds nothing and the
      // dependent law silently passes.
      return fileExt === cleanExt || lowerPath.endsWith(cleanExt);
    });
  }

  /**
   * Check if path is in directory (or subdirectory)
   */
  static isInDirectory(filePath: string, directoryPath: string): boolean {
    const normalizedFile = this.normalize(this.resolve(filePath));
    const normalizedDir = this.normalize(this.resolve(directoryPath));

    return (
      normalizedFile.startsWith(`${normalizedDir}/`) ||
      normalizedFile === normalizedDir
    );
  }

  /**
   * Check if filename matches pattern
   */
  static matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }

  // === COMMON PATH OPERATIONS ===

  /**
   * Get common paths used throughout the system
   */
  static getCommonPaths(projectRoot: string): Record<string, string> {
    return {
      packageJson: this.join(projectRoot, 'package.json'),
      nodeModules: this.join(projectRoot, 'node_modules'),
      srcDir: this.join(projectRoot, 'src'),
      distDir: this.join(projectRoot, 'dist'),
      buildDir: this.join(projectRoot, 'build'),
      testsDir: this.join(projectRoot, 'tests'),
      testDir: this.join(projectRoot, 'test'),
      configDir: this.join(projectRoot, 'config'),
      assetsDir: this.join(projectRoot, 'assets'),
      publicDir: this.join(projectRoot, 'public'),
      githubDir: this.join(projectRoot, '.github'),
      gitDir: this.join(projectRoot, '.git'),
    };
  }

  /**
   * Find workspace root by looking for marker files
   */
  static findWorkspaceRoot(startPath: string): string {
    const markers = [
      'package.json',
      'nx.json',
      'workspace.json',
      'angular.json',
      '.git',
      'lerna.json',
      'pnpm-workspace.yaml',
      'yarn.lock',
    ];

    let currentDir = this.resolve(startPath);
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      for (const marker of markers) {
        const _markerPath = this.join(currentDir, marker);
        // Note: We can't check file existence here as this utility
        // should not depend on file system operations
        // This method should be used with FileSystemOperations.exists()
      }

      currentDir = path.dirname(currentDir);
    }

    return startPath; // Fallback to start path
  }

  // === PATH LISTS AND ARRAYS ===

  /**
   * Remove duplicates from path array
   */
  static dedupePaths(paths: string[]): string[] {
    const normalized = paths.map(p => this.normalize(p));
    return Array.from(new Set(normalized));
  }

  /**
   * Sort paths by depth (shallow first)
   */
  static sortByDepth(paths: string[]): string[] {
    return paths.slice().sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      return depthA - depthB;
    });
  }

  /**
   * Group paths by directory
   */
  static groupByDirectory(paths: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const filePath of paths) {
      const dir = this.getDirectory(filePath);
      groups[dir] ??= [];
      groups[dir].push(filePath);
    }

    return groups;
  }

  // === CROSS-PLATFORM COMPATIBILITY ===

  /**
   * Get path separator for current platform
   */
  static getSeparator(): string {
    return path.sep;
  }

  /**
   * Convert Windows paths to Unix style
   */
  static toUnixStyle(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Convert to platform-specific style
   */
  static toPlatformStyle(filePath: string): string {
    return path.sep === '\\' ? filePath.replace(/\//g, '\\') : filePath;
  }
}
