/**
 * Path Resolver Utility
 * Resolves canonical paths to actual file locations based on pathMappings configuration
 * Supports monorepo structures like Nx, Lerna, etc.
 */

import { glob } from 'glob';
import type { RuleOfCodeConfig } from '../config/types';
import { PathOperations } from './path-operations';

export class PathResolver {
  private config?: RuleOfCodeConfig;
  private projectRoot: string;

  constructor(config: RuleOfCodeConfig | undefined, projectRoot: string) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Resolve a canonical path to actual file locations
   * @param canonicalPath - Standard path like 'src/app/app.config.ts'
   * @param mappingKey - Key in pathMappings config (e.g., 'appConfig')
   * @returns Array of resolved absolute file paths
   */
  async resolveCanonicalPath(
    canonicalPath: string,
    mappingKey?: keyof NonNullable<RuleOfCodeConfig['pathMappings']>
  ): Promise<string[]> {
    // First check pathMappings
    if (mappingKey && this.config?.pathMappings?.[mappingKey]) {
      const mapping = this.config.pathMappings[mappingKey];
      const patterns = Array.isArray(mapping) ? mapping : [mapping];

      const resolvedPaths: string[] = [];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // Glob pattern - resolve it
          const matches = await this.resolveGlobPattern(pattern);
          resolvedPaths.push(...matches);
        } else {
          // Literal path - construct absolute path
          const absolutePath = PathOperations.join(this.projectRoot, pattern);
          resolvedPaths.push(absolutePath);
        }
      }

      return resolvedPaths;
    }

    // No explicit mapping: resolve the canonical path AND auto-detect monorepo
    // (Nx / Lerna / Angular workspaces) variants, so projects without an explicit
    // `pathMappings` config still work out-of-the-box.
    return this.resolveWithMonorepoDetection(canonicalPath);
  }

  /**
   * Resolve a canonical path plus its monorepo variants by auto-detection.
   *
   * Returns the root-level standard path (e.g. `<root>/src/main.ts`) AND any matches
   * under common monorepo project folders (`apps/*`, `libs/*`, `packages/*`,
   * `projects/*`, nested one level), so an Nx workspace like
   * `apps/bot-admin/src/main.ts` is found even when no `pathMappings` is configured.
   */
  private async resolveWithMonorepoDetection(
    canonicalPath: string
  ): Promise<string[]> {
    const paths = new Set<string>([
      PathOperations.join(this.projectRoot, canonicalPath),
    ]);

    const projectDirs = '{apps,libs,packages,projects}';
    const monorepoPatterns = [
      `${projectDirs}/*/${canonicalPath}`,
      `${projectDirs}/*/*/${canonicalPath}`,
    ];

    for (const pattern of monorepoPatterns) {
      const matches = await this.resolveGlobPattern(pattern);
      matches.forEach(match => paths.add(match));
    }

    return [...paths];
  }

  /**
   * Resolve glob pattern to actual file paths
   * @param pattern - Glob pattern (e.g., 'apps/*\/src/app/app.config.ts')
   * @returns Array of matched file paths
   */
  private async resolveGlobPattern(pattern: string): Promise<string[]> {
    try {
      return await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.angular/**',
          '**/coverage/**',
          '**/.nx/**',
        ],
      });
    } catch (error) {
      console.warn(`Failed to resolve glob pattern: ${pattern}`, error);
      return [];
    }
  }

  /**
   * Get all possible paths for a canonical file
   * Useful for checking if any variant exists
   */
  async getAllPossiblePaths(canonicalPath: string): Promise<string[]> {
    const allPaths: string[] = [];

    // Add canonical path
    allPaths.push(PathOperations.join(this.projectRoot, canonicalPath));

    // Add all pathMappings variants
    if (this.config?.pathMappings) {
      for (const [key, value] of Object.entries(this.config.pathMappings)) {
        const patterns = Array.isArray(value) ? value : [value];

        for (const pattern of patterns) {
          if (pattern.includes('*')) {
            const matches = await this.resolveGlobPattern(pattern);
            allPaths.push(...matches);
          } else {
            allPaths.push(PathOperations.join(this.projectRoot, pattern));
          }
        }
      }
    }

    return [...new Set(allPaths)]; // Remove duplicates
  }

  /**
   * Resolve app config file paths
   */
  async getAppConfigPaths(): Promise<string[]> {
    return this.resolveCanonicalPath('src/app/app.config.ts', 'appConfig');
  }

  /**
   * Resolve app component file paths
   */
  async getAppComponentPaths(): Promise<string[]> {
    return this.resolveCanonicalPath(
      'src/app/app.component.ts',
      'appComponent'
    );
  }

  /**
   * Resolve app module file paths
   */
  async getAppModulePaths(): Promise<string[]> {
    return this.resolveCanonicalPath('src/app/app.module.ts', 'appModule');
  }

  /**
   * Resolve main.ts file paths
   */
  async getMainTsPaths(): Promise<string[]> {
    return this.resolveCanonicalPath('src/main.ts', 'mainTs');
  }

  /**
   * Resolve src root directory paths
   */
  async getSrcRootPaths(): Promise<string[]> {
    return this.resolveCanonicalPath('src', 'srcRoot');
  }

  /**
   * Create a PathResolver instance from config
   */
  static create(
    config: RuleOfCodeConfig | undefined,
    projectRoot: string
  ): PathResolver {
    return new PathResolver(config, projectRoot);
  }
}
