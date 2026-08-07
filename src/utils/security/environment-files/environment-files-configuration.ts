/**
 * Environment Files Configuration
 * Centralized configuration for environment files security analysis
 */

import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { StringTemplateUtils } from '../../string-template-utils';

// ============================================================================
// Types
// ============================================================================

export interface EnvCheckResult {
  violations: string[];
  suggestions: string[];
}

// ============================================================================
// Environment Files Patterns
// ============================================================================

export const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
] as const;

export const GITIGNORE_FILE = '.gitignore';
export const ENV_PATTERN = '.env';

// ============================================================================
// Sensitive Data Patterns
// ============================================================================

export const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'key',
  'token',
  'auth',
  'credential',
  'private',
  'cert',
  'ssl',
  'database',
  'db_',
  'api_key',
] as const;

export const PLACEHOLDER_PATTERNS = [
  /=your_/i,
  /=change_me/i,
  /=placeholder/i,
  /=example/i,
  /=xxx/i,
  /=\*+$/,
  /=\.\.\.$/,
  /=<.*>$/,
] as const;

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALID_VAR_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
export const SPACES_AROUND_EQUALS = ' = ';
export const COMMENT_PREFIX = '#';
export const EQUALS_SIGN = '=';
export const DOUBLE_QUOTE = '"';
export const SINGLE_QUOTE = "'";

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  // Gitignore messages
  gitignoreMissingEnv: '.gitignore should include .env files',
  gitignoreSuggestion: 'Add .env* to .gitignore to prevent accidental commits',
  createGitignore: 'Create .gitignore file to exclude sensitive files',

  // Sensitive data messages
  sensitiveData: '{fileName}:{line} - Potential sensitive data detected',
  sensitiveDataSuggestion:
    'Replace real values with placeholders in committed env files',

  // Format messages
  emptyValue: '{fileName}:{line} - Environment variable has no value',
  spacesAroundEquals:
    '{fileName}:{line} - Avoid spaces around equals in env files',
  spacesAroundEqualsSuggestion: 'Use KEY=value format without spaces',
  invalidFormat: '{fileName}:{line} - Invalid env file format',
  invalidFormatSuggestion: 'Use KEY=value format for environment variables',
  duplicateVar: '{fileName}:{line} - Duplicate environment variable: {key}',
  duplicateVarSuggestion: 'Remove duplicate variable definitions',
  invalidVarName: '{fileName}:{line} - Invalid variable name: {key}',
  invalidVarNameSuggestion:
    'Use UPPER_CASE naming convention for environment variables',
  unmatchedQuotes: '{fileName}:{line} - Unmatched quotes in value',
  unmatchedQuotesSuggestion: 'Ensure quotes are properly matched in values',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Never commit .env files with real secrets to version control',
  'Use .env.example files to document required variables',
  'Add .env* to .gitignore to prevent accidental commits',
  'Use placeholder values in example files',
  'Follow UPPER_CASE naming conventions for env variables',
  'Validate all required environment variables at startup',
  'Use different env files for different environments',
] as const;

// ============================================================================
// Helper Functions (shared with SecretManagementConfiguration)
// ============================================================================

import {
  createEmptyConfigResult,
  mergeConfigResults,
} from '../shared-configuration-base';

export function createEmptyResult(): EnvCheckResult {
  return createEmptyConfigResult();
}

export function mergeResults(...results: EnvCheckResult[]): EnvCheckResult {
  return mergeConfigResults(...results);
}

// Pattern matching delegated to PatternMatchingUtils
export const { hasPattern, hasAnyPattern, hasAnyRegexPattern } =
  PatternMatchingUtils;

// Message formatting delegated to StringTemplateUtils
export const formatMessage = StringTemplateUtils.formatNamedTemplate;

export function getEnvFilePath(projectRoot: string, envFile: string): string {
  return PathOperations.join(projectRoot, envFile);
}

export function envFileExists(projectRoot: string, envFile: string): boolean {
  return FileUtils.exists(getEnvFilePath(projectRoot, envFile));
}

export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

export function isPlaceholderValue(line: string): boolean {
  return hasAnyRegexPattern(line, PLACEHOLDER_PATTERNS);
}

export function containsSensitiveData(content: string): boolean {
  return hasAnyPattern(content.toLowerCase(), SENSITIVE_KEYWORDS);
}

export function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || trimmed.startsWith(COMMENT_PREFIX);
}

export function isValidVarName(key: string): boolean {
  return VALID_VAR_NAME_PATTERN.test(key);
}

export function hasSpacesAroundEquals(line: string): boolean {
  return hasPattern(line, SPACES_AROUND_EQUALS);
}

export function hasUnmatchedQuotes(value: string): boolean {
  const startsWithDouble = value.startsWith(DOUBLE_QUOTE);
  const endsWithDouble = value.endsWith(DOUBLE_QUOTE);
  const startsWithSingle = value.startsWith(SINGLE_QUOTE);
  const endsWithSingle = value.endsWith(SINGLE_QUOTE);

  return (
    (startsWithDouble && !endsWithDouble) ||
    (startsWithSingle && !endsWithSingle)
  );
}

export function splitLines(content: string): string[] {
  // Split on real newlines. This was `split('\\n')` — the two-character string
  // backslash-n — so a whole .env was treated as ONE line: every violation was
  // reported at :1, and the "key" spanned newlines and tripped the invalid-name
  // check on every valid file.
  return content.split(/\r?\n/);
}

export function hasEmptyValue(line: string): boolean {
  return hasPattern(line, '=') && line.endsWith('=');
}

export function parseEnvLine(
  line: string
): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!hasPattern(trimmed, EQUALS_SIGN)) return null;

  const [key, ...valueParts] = trimmed.split(EQUALS_SIGN);
  return { key: key ?? '', value: valueParts.join(EQUALS_SIGN) };
}
