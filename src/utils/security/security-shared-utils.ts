/**
 * Security Shared Utilities
 * Common helper functions shared across security analyzers
 * RULE 2: Centralized utilities to eliminate duplication
 */

import { ProjectTypeDetector } from '../config/project-type-detector/project-type-detector';
import { CONFIG_FILES, DIRECTORY_NAMES, DOC_FILES } from '../file-constants';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { PatternMatchingUtils } from '../pattern-matching-utils';

// ============================================================================
// Common Types
// ============================================================================

export interface SecurityCheckResult {
  violations: string[];
  suggestions: string[];
}

export interface SecurityCheckResultWithScore extends SecurityCheckResult {
  score: number;
}

// ============================================================================
// Result Factory Functions
// ============================================================================

/** A result with no violations and no suggestions — the starting value analyzers add to. */
export function createEmptyResult(): SecurityCheckResult {
  return { violations: [], suggestions: [] };
}

/** A result with no violations or suggestions and the given score (100 when omitted). */
export function createEmptyResultWithScore(
  score = 100
): SecurityCheckResultWithScore {
  return { violations: [], suggestions: [], score };
}

/** Concatenates the violations and the suggestions of all results, in argument order. */
export function mergeResults(
  ...results: SecurityCheckResult[]
): SecurityCheckResult {
  return results.reduce(
    (acc, result) => ({
      violations: [...acc.violations, ...result.violations],
      suggestions: [...acc.suggestions, ...result.suggestions],
    }),
    createEmptyResult()
  );
}

// ============================================================================
// Re-exported Utilities
// ============================================================================

/**
 * Joins path segments with PathOperations.join: null, undefined and blank
 * segments are dropped, the rest trimmed; '' when no segment remains.
 */
export const joinPath = (...segments: Array<string | null | undefined>) =>
  PathOperations.join(...segments);
export const { exists, readFile, getDefaultConfig } = FileUtils;
export const { hasPattern, hasAnyPattern } = PatternMatchingUtils;

// Default scan config for DirectoryScanner
export const DEFAULT_SCAN_CONFIG = getDefaultConfig();

// ============================================================================
// File Operations
// ============================================================================

/** The file's UTF-8 text, or '' when it does not exist or cannot be read (never throws). */
export function safeReadFile(filePath: string): string {
  try {
    return readFile(filePath);
  } catch {
    return '';
  }
}

/** Whether `file`, a path relative to `projectRoot`, exists. */
export function fileExists(projectRoot: string, file: string): boolean {
  return exists(joinPath(projectRoot, file));
}

/** Whether at least one of `files` (relative to `projectRoot`) exists. */
export function checkFilesExist(
  projectRoot: string,
  files: readonly string[]
): boolean {
  return files.some(file => fileExists(projectRoot, file));
}

/**
 * Whether at least one existing file of `files` (relative to `projectRoot`)
 * contains one of `searchTerms`. The file text is lower-cased before the
 * plain substring match, so the terms must be written in lower case to match.
 */
export function checkFilesForContent(
  projectRoot: string,
  files: readonly string[],
  searchTerms: readonly string[]
): boolean {
  return files.some(file => {
    const filePath = joinPath(projectRoot, file);
    if (!exists(filePath)) return false;
    const content = safeReadFile(filePath).toLowerCase();
    return hasAnyPattern(content, searchTerms);
  });
}

/** The text of `file` relative to `projectRoot`, or '' when it cannot be read. */
export function readFileContent(projectRoot: string, file: string): string {
  return safeReadFile(joinPath(projectRoot, file));
}

// ============================================================================
// Package.json Utilities (delegated to ProjectTypeDetector)
// ============================================================================

export const { getPackageJson } = ProjectTypeDetector;
export const { getAllDependencies } = ProjectTypeDetector;

// ============================================================================
// NPM Registry Utilities
// ============================================================================

/**
 * Whether the project's root .npmrc sets `registry=` and does not mention
 * npmjs.org anywhere in the file. False when there is no .npmrc.
 */
export function hasCustomNpmRegistry(projectRoot: string): boolean {
  const content = readFileContent(projectRoot, CONFIG_FILES.NPMRC);
  if (!content) return false;
  return content.includes('registry=') && !content.includes('npmjs.org');
}

// ============================================================================
// Re-exported Constants
// ============================================================================

export { CONFIG_FILES, DIRECTORY_NAMES, DOC_FILES };
