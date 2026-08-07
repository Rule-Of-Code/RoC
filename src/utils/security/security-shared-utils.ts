/**
 * Security Shared Utilities
 * Common helper functions shared across security analyzers
 * RULE 2: Centralized utilities to eliminate duplication
 */

import { ConfigFileUtils } from '../config-file-utils';
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

export function createEmptyResult(): SecurityCheckResult {
  return { violations: [], suggestions: [] };
}

export function createEmptyResultWithScore(
  score = 100
): SecurityCheckResultWithScore {
  return { violations: [], suggestions: [], score };
}

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

export const joinPath = (...segments: Array<string | null | undefined>) =>
  PathOperations.join(...segments);
export const { exists, readFile, getDefaultConfig } = FileUtils;
export const { hasPattern, hasAnyPattern } = PatternMatchingUtils;

// Default scan config for DirectoryScanner
export const DEFAULT_SCAN_CONFIG = getDefaultConfig();

// ============================================================================
// File Operations
// ============================================================================

export function safeReadFile(filePath: string): string {
  try {
    return readFile(filePath);
  } catch {
    return '';
  }
}

export function fileExists(projectRoot: string, file: string): boolean {
  return exists(joinPath(projectRoot, file));
}

export function checkFilesExist(
  projectRoot: string,
  files: readonly string[]
): boolean {
  return files.some(file => fileExists(projectRoot, file));
}

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

export function readFileContent(projectRoot: string, file: string): string {
  return safeReadFile(joinPath(projectRoot, file));
}

// ============================================================================
// Package.json Utilities (delegated to ProjectTypeDetector)
// ============================================================================

export const { getPackageJson } = ProjectTypeDetector;
export const { getAllDependencies } = ProjectTypeDetector;

export function loadPackageJson(path: string): Record<string, unknown> | null {
  try {
    return ConfigFileUtils.loadConfig(path);
  } catch {
    return null;
  }
}

// ============================================================================
// NPM Registry Utilities
// ============================================================================

export function hasCustomNpmRegistry(projectRoot: string): boolean {
  const content = readFileContent(projectRoot, CONFIG_FILES.NPMRC);
  if (!content) return false;
  return content.includes('registry=') && !content.includes('npmjs.org');
}

// ============================================================================
// Re-exported Constants
// ============================================================================

export { CONFIG_FILES, DIRECTORY_NAMES, DOC_FILES };
