/**
 * File Filtering Utilities
 * Handles include/exclude patterns and file filtering logic
 */

import { minimatch } from 'minimatch';
import type { RuleOfCodeConfig } from '../config/types';
import { PATTERNS, SKIP_DIRECTORIES } from './constants';
import { PathOperations } from './path-operations';
export class FileFilterUtils {
  /**
   * Readable slug of the CURRENTLY checked law (kebab from its title), set by the
   * registry before each law. Lets `ignores.byRule`/`includes.byRule` match by a
   * readable key (e.g. "magic-number-prevention"), even though many checkers
   * reconstruct the context without a lawId along the file-scanning chain.
   * ⚠️ This is safe because the audit runs SEQUENTIALLY (maxConcurrent: 1) — one law
   * at a time. The registry resets it after each law.
   */
  static currentLawConfigKey: string | undefined;

  /**
   * Filter files based on includes/excludes configuration
   */
  static filterFilesByConfig(
    files: string[],
    _config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    // 🛡️ POSITIVE INCLUSION APPROACH - If includes.global is specified
    if (_config.includes?.global && _config.includes.global.length > 0) {
      const includePatterns = _config.includes.global;

      // Check law-specific includes
      if (lawId && _config.includes.byRule?.[lawId]) {
        includePatterns.push(..._config.includes.byRule[lawId]);
      }

      return FileFilterUtils.applyInclusionFilters(files, includePatterns);
    }

    // 🛡️ NEGATIVE EXCLUSION APPROACH - Traditional filtering (already handled by glob ignore)
    return files;
  }

  /**
   * Get standard ignore patterns for file scanning
   * @param includeTests - If true, don't add test file patterns to ignore list
   */
  static getIgnorePatterns(
    _config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): string[] {
    const basePatterns = [
      `**/${SKIP_DIRECTORIES.NODE_MODULES}/**`,
      `**/${SKIP_DIRECTORIES.DIST}/**`,
      `**/${SKIP_DIRECTORIES.NX}/**`,
      `**/${SKIP_DIRECTORIES.ANGULAR}/**`,
      `**/${SKIP_DIRECTORIES.COVERAGE}/**`,
      '**/environment.template.ts',
      '**/ios/App/App/public/**',
      '**/android/app/build/**',
      'tools/seed-emulator.ts',
      '**/logger.service.ts',
      'apps/**/generate-icons.js',
      '**/packages/ruleofcode/**',
      '**/tools/constitutional-compliance/**',
      'scripts/**',
    ];

    // Only add test patterns if includeTests is false
    if (!includeTests) {
      basePatterns.push(
        PATTERNS.SPEC_FILES,
        PATTERNS.TEST_FILES,
        '**/cypress/**',
        '**/*-e2e/**',
        '**/e2e/**',
        '**/test/**',
        '**/tests/**'
      );
    }

    const patterns = [...basePatterns];
    if (_config.ignores?.global?.length > 0) {
      if (includeTests) {
        // PROFESSIONAL FIX: Filter out test patterns from config.ignores.global when includeTests=true
        // This prevents config-level test ignores from overriding includeTests parameter
        const testPatterns = [
          PATTERNS.SPEC_FILES,
          PATTERNS.TEST_FILES,
          '**/*.spec.ts',
          '**/*.test.ts',
          '**/*.spec.js',
          '**/*.test.js',
          '**/cypress/**',
          '**/*-e2e/**',
          '**/e2e/**',
          '**/test/**',
          '**/tests/**',
        ];
        const filteredGlobalIgnores = _config.ignores.global.filter(
          pattern => !testPatterns.includes(pattern)
        );
        patterns.push(...filteredGlobalIgnores);
      } else {
        patterns.push(..._config.ignores.global);
      }
    }

    // Add categorical ignores
    if (_config.ignores?.tests?.length > 0) {
      patterns.push(..._config.ignores.tests);
    }
    if (_config.ignores?.build?.length > 0) {
      patterns.push(..._config.ignores.build);
    }
    if (_config.ignores?.design?.length > 0) {
      patterns.push(..._config.ignores.design);
    }

    // Apply rule-specific ignores. Match by the hashed lawId (legacy) and by the
    // readable lawConfigKey slug (e.g. "magic-number-prevention") — so that the
    // readable `ignores.byRule` keys in the config work, not just the hashed ones.
    if (lawId && _config.ignores?.byRule?.[lawId]) {
      patterns.push(..._config.ignores.byRule[lawId]);
    }
    const ignoreSlug = FileFilterUtils.currentLawConfigKey;
    if (ignoreSlug && _config.ignores?.byRule?.[ignoreSlug]) {
      patterns.push(..._config.ignores.byRule[ignoreSlug]);
    }

    return patterns;
  }

  /**
   * Check if file should be ignored for constitutional scanning
   * @param includeTests - If true, don't ignore test files
   */
  static shouldIgnoreFile(
    filePath: string,
    _config: RuleOfCodeConfig,
    lawId?: string,
    includeTests = false
  ): boolean {
    // Windows relative paths arrive with backslashes; include/ignore patterns
    // are written with forward slashes. Normalize once, or the directory
    // prefix checks below silently skip whole trees.
    filePath = filePath.replace(/\\/g, '/');

    // ALWAYS check ignore patterns first regardless of includes
    const ignorePatterns = FileFilterUtils.getIgnorePatterns(
      _config,
      lawId,
      includeTests
    );

    // Check if file/directory matches ignore patterns
    const isIgnored = ignorePatterns.some(pattern => {
      // Direct match
      if (minimatch(filePath, pattern)) {
        return true;
      }

      // For directories, also check if any file inside would be ignored
      if (FileFilterUtils.isDirectory(filePath)) {
        const dirPath = FileFilterUtils.normalizeDirPath(filePath);

        // For node_modules check
        if (
          pattern === `**/${SKIP_DIRECTORIES.NODE_MODULES}/**` &&
          (filePath === SKIP_DIRECTORIES.NODE_MODULES ||
            filePath.endsWith(`/${SKIP_DIRECTORIES.NODE_MODULES}`) ||
            filePath.includes(SKIP_DIRECTORIES.NODE_MODULES))
        ) {
          return true;
        }

        // Test if files inside this directory would be ignored
        const testFilePath = `${dirPath}/test.ts`;
        if (minimatch(testFilePath, pattern)) {
          return true;
        }
      }

      return false;
    });

    // If explicitly ignored, return true
    if (isIgnored) {
      return true;
    }

    // If no includes specified, use only ignore patterns (traditional approach)
    if (!_config.includes?.global || _config.includes.global.length === 0) {
      return false;
    }

    // Use positive inclusion if specified
    const includePatterns = [..._config.includes.global];
    if (lawId && _config.includes.byRule?.[lawId]) {
      includePatterns.push(..._config.includes.byRule[lawId]);
    }
    const includeSlug = FileFilterUtils.currentLawConfigKey;
    if (includeSlug && _config.includes.byRule?.[includeSlug]) {
      includePatterns.push(..._config.includes.byRule[includeSlug]);
    }

    // For directories, check if they could potentially contain included
    // files. Pruning is an OPTIMIZATION — when we cannot reason about a
    // path (scan root '', absolute paths vs root-relative patterns,
    // star-less file patterns) we must traverse and let the file-level
    // check decide. Wrong pruning kills the whole scan silently (QA-1).
    if (FileFilterUtils.isDirectory(filePath)) {
      const dirPath = FileFilterUtils.normalizeDirPath(filePath);
      // The scan root arrives as '' — it can always contain included files.
      if (dirPath === '') return false;
      // Include patterns are project-root-relative; an absolute directory
      // path can't be compared against them — traverse.
      if (PathOperations.isAbsolute(dirPath)) return false;
      const couldContainFiles = includePatterns.some(rawPattern => {
        const pattern = rawPattern.replace(/\\/g, '/');
        const starIdx = pattern.indexOf('*');
        if (starIdx === -1) {
          // Star-less FILE pattern ('conf/x.rules') carries no directory
          // information for pruning — traverse.
          if (PathOperations.getExtension(pattern)) return true;
          // A bare directory pattern ('libs', 'libs/') means its whole tree.
          const patternDir = `${pattern.replace(/\/$/, '')}/`;
          return (
            patternDir.startsWith(`${dirPath}/`) ||
            dirPath.startsWith(patternDir)
          );
        }
        const patternDir = pattern.substring(0, starIdx);
        return (
          patternDir === '' ||
          patternDir.startsWith(`${dirPath}/`) ||
          dirPath.startsWith(patternDir)
        );
      });
      return !couldContainFiles;
    }

    // Root-relative patterns can't judge an absolute file path — the caller
    // is expected to pass relative paths (the scanner does); don't exclude
    // on the include-whitelist basis here (ignores were already applied).
    if (PathOperations.isAbsolute(filePath)) return false;

    return !FileFilterUtils.applyInclusionFilters(
      [filePath],
      includePatterns
    ).includes(filePath);
  }

  /**
   * Check if path is directory based on extension
   */
  private static isDirectory(filePath: string): boolean {
    return !PathOperations.getExtension(filePath) || filePath.endsWith('/');
  }

  /**
   * Normalize directory path by removing trailing slash
   */
  private static normalizeDirPath(filePath: string): string {
    return filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
  }
  static applyInclusionFilters(
    files: string[],
    includePatterns: string[]
  ): string[] {
    if (includePatterns.length === 0) {
      return files;
    }

    // Patterns are root-relative with forward slashes. Normalize file
    // separators before matching (Windows paths arrive with backslashes),
    // and let a bare directory pattern ('libs', 'libs/') include its whole
    // tree — matching nothing at all is never what a whitelist means.
    const expanded = includePatterns.flatMap(rawPattern => {
      const pattern = rawPattern.replace(/\\/g, '/');
      return pattern.includes('*')
        ? [pattern]
        : [pattern, `${pattern.replace(/\/$/, '')}/**`];
    });

    return files.filter(file => {
      const normalized = file.replace(/\\/g, '/');
      return expanded.some(pattern => minimatch(normalized, pattern));
    });
  }
}
