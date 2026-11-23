/**
 * Audit Results Cache
 * Caches audit results to improve performance on subsequent runs
 */

import { execSync } from '../../utils/child-process';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FileUtils } from '../../utils/file-utils';
import { warnUser } from '../../utils/logging-utils';
import { PathOperations } from '../../utils/path-operations';
import type { AuditResult } from './audit-types';

/**
 * An AuditResult as JSON holds it: JSON has no Map, so the per-law results
 * are written as a plain object and read back into a Map.
 */
export type StoredAuditResult = Omit<AuditResult, 'results'> & {
  results: Record<string, unknown>;
};

export interface CacheEntry {
  results: StoredAuditResult;
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

  /**
   * The RuleOfCode version that COMPUTED this verdict.
   *
   * Every release changes what laws report — that is what a release IS here.
   * The key was files + config + git state + mode, none of which change when
   * the tool is upgraded, so a consumer who upgraded and re-ran was served the
   * previous version's answer: identical output, byte for byte, from a build
   * that no longer existed.
   *
   * That made every fix we ship invisible to anyone with caching on, and it
   * cost a reporter a second round trip — they upgraded, re-tested, saw no
   * change, and correctly filed it as unfixed. Worse in the other direction: a
   * law tightened in a new version keeps serving the old PASSED.
   *
   * Entries written before this field existed have `toolVersion === undefined`,
   * which never equals a real version string, so they invalidate safely.
   */
  toolVersion: string;

  /**
   * The CODE that computed this verdict: a hash of the running package's
   * compiled sources (see {@link AuditCache.codeFingerprint}).
   *
   * The version string alone did not identify a build. Two release
   * candidates, a local build, `npm link` or an install from git all report
   * the same version with different detectors, and the second build served
   * the first build's verdict, indistinguishable from its own (#391).
   *
   * Entries written before this field existed have `codeFingerprint ===
   * undefined`, which never equals a real hash, so they invalidate safely.
   */
  codeFingerprint: string;
}

export class AuditCache {
  /** This tool's own version, read from its manifest. */
  private static toolVersion(): string {
    try {
      const pkg = require('../../../package.json') as { version?: string };
      return pkg.version ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * The top of the running code tree: `dist/` in the installed package (this
   * file is `dist/core/auditing/audit-cache.js`), `src/` under ts-jest.
   */
  static codeRoot: string = path.resolve(__dirname, '..', '..');

  /** Fingerprints by code root; the code does not change while it runs. */
  private static readonly fingerprints = new Map<string, string>();

  /** A compiled or source module of the tool; declarations carry no behaviour. */
  private static isCodeFile(name: string): boolean {
    return (
      (name.endsWith('.js') || name.endsWith('.ts')) && !name.endsWith('.d.ts')
    );
  }

  /**
   * SHA-256 over the relative path and CONTENT of every code file under
   * {@link codeRoot}, in a fixed order. Content, not mtime: `npm pack` gives
   * every file the same fixed mtime, so two candidates installed from their
   * tarballs differ only in content, and a detector change can keep a file's
   * size. Computed once per process and only when the cache is consulted, so
   * nothing build-specific is written into the package and `npm pack` stays
   * reproducible. Unreadable code yields a fresh random value: no hit, ever,
   * rather than a hit we cannot vouch for.
   */
  static codeFingerprint(root: string = this.codeRoot): string {
    const known = this.fingerprints.get(root);
    if (known) return known;
    let fingerprint: string;
    try {
      const hash = crypto.createHash('sha256');
      for (const file of this.codeFiles(root)) {
        hash.update(`${path.relative(root, file).split(path.sep).join('/')}\0`);
        hash.update(fs.readFileSync(file));
        hash.update('\0');
      }
      fingerprint = hash.digest('hex');
    } catch {
      fingerprint = `unreadable-${crypto.randomUUID()}`;
    }
    this.fingerprints.set(root, fingerprint);
    return fingerprint;
  }

  /** Code files under `dir`, sorted by path. */
  private static codeFiles(dir: string): string[] {
    const files: string[] = [];
    const walk = (current: string): void => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (this.isCodeFile(entry.name)) files.push(full);
      }
    };
    walk(dir);
    return files.sort();
  }

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

      if (cacheData.toolVersion !== this.toolVersion()) {
        // A verdict computed by another version of this tool. Upgrading is
        // precisely when the answer is expected to change.
        return null;
      }

      if (cacheData.gitState !== this.getGitState(projectRoot)) {
        // Branch switched or new commit — git-derived violations may be stale.
        // (Caches written before this field existed have `gitState === undefined`,
        // which never equals a real state string, so they invalidate safely.)
        return null;
      }

      if (cacheData.codeFingerprint !== this.codeFingerprint()) {
        // Same version, different build: its detectors may answer differently.
        // Checked last, so the hash is computed only for an otherwise valid entry.
        return null;
      }

      // Convert results back to Map (JSON.parse converts Maps to objects)
      const stored = cacheData.results;
      return {
        ...stored,
        results: new Map(Object.entries(stored.results ?? {})),
      };
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
      const serializableResults: StoredAuditResult = {
        ...results,
        results:
          results.results instanceof Map
            ? Object.fromEntries(results.results.entries())
            : results.results,
      };

      const cacheEntry: CacheEntry = {
        results: serializableResults,
        timestamp: Date.now(),
        filesHash,
        configHash,
        gitState: this.getGitState(projectRoot),
        mode,
        toolVersion: this.toolVersion(),
        codeFingerprint: this.codeFingerprint(),
      };

      FileUtils.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      // Cache write error, ignore (non-critical)
      warnUser('Warning: Failed to write cache');
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
    hash.update(
      JSON.stringify(config, (key, value: unknown) =>
        AuditCache.RUN_DERIVED_KEYS.has(key) ? undefined : value
      )
    );
    return hash.digest('hex');
  }

  /**
   * Keys the engine writes INTO the config during a run. They are derived
   * from the config, not inputs to it, so they must not change its hash: the
   * engine injecting `laws.__plannedLawCount` made every key written differ
   * from the key read, and the cache never hit (#305).
   */
  private static readonly RUN_DERIVED_KEYS = new Set(['__plannedLawCount']);

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
