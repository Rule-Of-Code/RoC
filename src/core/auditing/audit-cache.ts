/**
 * Audit Results Cache
 * Caches audit results to improve performance on subsequent runs
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { AuditResult } from './audit-types';

export interface CacheEntry {
  results: AuditResult;
  timestamp: number;
  filesHash: string;
  configHash: string;
  /**
   * Current branch + HEAD commit (`branch@sha`) at the time results were cached.
   * Git-law violations (Branch Governance, Commit Message Standards, …) depend on
   * git state, NOT on scanned-file mtimes — so without this key a stale violation
   * would survive a branch switch or new commit that left the source files
   * untouched. Empty string when the project is not a git repo.
   */
  gitState: string;

  /**
   * The audit MODE the cached verdict was computed under.
   *
   * Different modes deliberately audit different law sets — `pre-commit` skips
   * the three git-history laws, and a Pareto run checks a subset. The key was
   * files + config + git state, none of which change with the mode, and there is
   * one cache file per project: so a `--mode=full` verdict could be served to a
   * `--mode=pre-commit` run, and — the direction that matters — a deliberately
   * NARROWER pre-commit verdict could be served as a full audit's answer. That
   * is a disarmed gate wearing the word PASSED, which is the one failure this
   * whole rule set exists to prevent.
   *
   * Entries written before this field existed have `mode === undefined`, which
   * never equals a real mode string, so they invalidate safely.
   */
  mode: string;
}

export class AuditCache {
  private static readonly CACHE_DIR = '.ruleofcode-cache';
  private static readonly CACHE_FILE = 'audit-results.json';
  private static readonly MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached audit results if valid
   */
  static get(
    projectRoot: string,
    filesHash: string,
    configHash: string,
    mode: string
  ): AuditResult | null {
    try {
      const cachePath = this.getCachePath(projectRoot);

      if (!FileUtils.exists(cachePath)) {
        return null;
      }

      const cacheData = FileUtils.readJsonFile<CacheEntry>(cachePath);

      if (!cacheData) {
        return null;
      }

      // Validate cache
      const now = Date.now();
      const age = now - cacheData.timestamp;

      if (age > this.MAX_CACHE_AGE_MS) {
        // Cache too old
        return null;
      }

      if (cacheData.filesHash !== filesHash) {
        // Files changed
        return null;
      }

      if (cacheData.configHash !== configHash) {
        // Config changed
        return null;
      }

      if (cacheData.mode !== mode) {
        // A verdict computed under another mode audits a different law set.
        return null;
      }

      if (cacheData.gitState !== this.getGitState(projectRoot)) {
        // Branch switched or new commit — git-derived violations may be stale.
        // (Caches written before this field existed have `gitState === undefined`,
        // which never equals a real state string, so they invalidate safely.)
        return null;
      }

      // Convert results back to Map (JSON.parse converts Maps to objects)
      const results = cacheData.results;
      if (
        results.results &&
        typeof results.results === 'object' &&
        !(results.results instanceof Map)
      ) {
        results.results = new Map(Object.entries(results.results));
      }

      return results;
    } catch (error) {
      // Cache read error, ignore
      return null;
    }
  }

  /**
   * Save audit results to cache
   */
  static set(
    projectRoot: string,
    results: AuditResult,
    filesHash: string,
    configHash: string,
    mode: string
  ): void {
    try {
      const cacheDir = PathOperations.join(projectRoot, this.CACHE_DIR);
      FileUtils.createDirectory(cacheDir);

      const cachePath = this.getCachePath(projectRoot);

      // Convert Map to object for JSON serialization
      const serializableResults = {
        ...results,
        results:
          results.results instanceof Map
            ? Object.fromEntries(results.results.entries())
            : results.results,
      };

      const cacheEntry: CacheEntry = {
        results: serializableResults as unknown as AuditResult,
        timestamp: Date.now(),
        filesHash,
        configHash,
        gitState: this.getGitState(projectRoot),
        mode,
      };

      FileUtils.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      // Cache write error, ignore (non-critical)
      console.warn('Warning: Failed to write cache');
    }
  }

  /**
   * Clear cache
   */
  static clear(projectRoot: string): void {
    try {
      const cachePath = this.getCachePath(projectRoot);
      if (FileUtils.exists(cachePath)) {
        FileUtils.deleteFile(cachePath);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Generate hash of files for cache validation
   */
  static generateFilesHash(files: string[]): string {
    const hash = crypto.createHash('sha256');

    // Sort files for consistent hashing
    const sortedFiles = [...files].sort();

    for (const file of sortedFiles) {
      if (FileUtils.exists(file)) {
        const stats = FileUtils.getFileStats(file);
        if (stats) {
          // Hash file path + size + mtime for performance
          hash.update(`${file}:${stats.size}:${stats.mtimeMs}`);
        }
      }
    }

    return hash.digest('hex');
  }

  /**
   * Generate hash of config for cache validation
   */
  static generateConfigHash(config: unknown): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(config));
    return hash.digest('hex');
  }

  private static getCachePath(projectRoot: string): string {
    return PathOperations.join(projectRoot, this.CACHE_DIR, this.CACHE_FILE);
  }

  /**
   * Capture the git state (`branch@sha`) used to key the cache. Returns an empty
   * string when the project is not a git repo or git is unavailable, so non-git
   * projects keep a stable (cacheable) key.
   */
  private static getGitState(projectRoot: string): string {
    const run = (command: string): string => {
      try {
        return execSync(command, {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
      } catch {
        return '';
      }
    };

    const branch = run('git rev-parse --abbrev-ref HEAD');
    const head = run('git rev-parse HEAD');
    return branch || head ? `${branch}@${head}` : '';
  }
}
