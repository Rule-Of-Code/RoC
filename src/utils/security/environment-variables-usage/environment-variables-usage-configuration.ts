/**
 * Environment Variables Usage Configuration
 * Centralized configuration for environment variables usage analysis
 */

import { FileUtils } from '../../file-utils';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { StringTemplateUtils } from '../../string-template-utils';

// ============================================================================
// Types
// ============================================================================

export interface EnvUsageCheckResult {
  violations: string[];
  suggestions: string[];
}

// ============================================================================
// Process.env Patterns
// ============================================================================

export const PROCESS_ENV_DESTRUCTURING = /const\s+{[^}]+}\s*=\s*process\.env/;

export const PORT_ENV_VAR = 'process.env.PORT';
export const PARSE_INT = 'parseInt';

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALIDATION_LIBRARIES = [
  'required',
  'validate',
  'schema',
  'joi',
  'zod',
  'yup',
] as const;

export const ENVIRONMENT_INDICATORS = ['production', 'development'] as const;
export const NODE_ENV = 'NODE_ENV';
export const PROCESS_ENV = 'process.env';

export const ENV_USAGE_THRESHOLD = 3;

export const PROCESS_ENV_COUNT_PATTERN = /process\.env\./g;

// ============================================================================
// Hardcoded Value Patterns
// ============================================================================

export const DB_CONNECTION_PATTERNS = [
  /mongodb:\/\/[^\s'"]+/g,
  /mysql:\/\/[^\s'"]+/g,
  /postgresql:\/\/[^\s'"]+/g,
  /redis:\/\/[^\s'"]+/g,
] as const;

export const SECRET_PATTERNS = [
  /api_key['"]\s*[=:]\s*['"][^'"]{20,}['"]/gi,
  /token['"]\s*[=:]\s*['"][^'"]{20,}['"]/gi,
  /secret['"]\s*[=:]\s*['"][^'"]{20,}['"]/gi,
] as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  // Process.env usage messages
  noFallback: '{filePath}: Environment variable {envVar} used without fallback',
  noFallbackSuggestion:
    'Provide default value for {envVar} or validate its presence',
  portNotParsed: 'Convert PORT environment variable to number with parseInt()',
  destructuringNoValidation:
    'Consider validating destructured environment variables',

  // Validation messages
  needsValidationSchema:
    'Consider implementing environment variable validation schema',
  useNodeEnv: 'Consider using NODE_ENV to differentiate between environments',

  // Hardcoded values messages
  hardcodedUrl: '{filePath}: Hardcoded URL detected: {url}',
  hardcodedUrlSuggestion:
    'Move URLs to environment variables for different environments',
  hardcodedDbConnection:
    '{filePath}: Hardcoded database connection string detected',
  hardcodedDbSuggestion:
    'Move database connection strings to environment variables',
  hardcodedSecret: '{filePath}: Potential hardcoded secret detected',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Always provide fallback values for environment variables',
  'Validate required environment variables at application startup',
  'Use environment variable validation libraries (joi, zod, yup)',
  'Convert string environment variables to appropriate types',
  'Use NODE_ENV to differentiate between environments',
  'Move all configuration to environment variables',
  'Document required environment variables in README',
] as const;

export const BEST_PRACTICES = {
  good: [
    'const port = parseInt(process.env.PORT || "3000", 10);',
    'const dbUrl = process.env.DATABASE_URL ?? "sqlite://memory";',
    'if (!process.env.API_KEY) throw new Error("API_KEY required");',
    'const config = validateEnvSchema(process.env);',
  ],
  bad: [
    'const port = process.env.PORT;',
    'const url = "https://api.example.com";',
    'const apiKey = "sk-1234567890abcdef";',
    'process.env.SECRET_KEY without validation',
  ],
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

import { mergeSecurityResults } from '../result-merging-helper';

/** A result with no violations and no suggestions. */
export function createEmptyResult(): EnvUsageCheckResult {
  return { violations: [], suggestions: [] };
}

/** Concatenates the violations and suggestions of `results`, in order. */
export function mergeResults(
  ...results: EnvUsageCheckResult[]
): EnvUsageCheckResult {
  return mergeSecurityResults(createEmptyResult, ...results);
}

// Pattern matching delegated to PatternMatchingUtils
export const { hasPattern, hasAnyPattern, hasAnyRegexPattern } =
  PatternMatchingUtils;

// Message formatting delegated to StringTemplateUtils
export const formatMessage = StringTemplateUtils.formatNamedTemplate;

/** Reads `filePath` as text; '' when it cannot be read. */
export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

/**
 * Whether `content` mentions `required`, `validate`, `schema`, `joi`, `zod`
 * or `yup` anywhere (case-sensitive substring, not an import check).
 */
export function hasValidationLibrary(content: string): boolean {
  return hasAnyPattern(content, VALIDATION_LIBRARIES);
}

/** Whether `content` contains `production` or `development`. */
export function hasEnvironmentIndicators(content: string): boolean {
  return hasAnyPattern(content, ENVIRONMENT_INDICATORS);
}

/** Whether `content` contains the text `NODE_ENV`. */
export function hasNodeEnv(content: string): boolean {
  return hasPattern(content, NODE_ENV);
}

/** Whether `content` contains the text `process.env`. */
export function hasProcessEnv(content: string): boolean {
  return hasPattern(content, PROCESS_ENV);
}

/** How many times `process.env.` occurs in `content`. */
export function countEnvUsage(content: string): number {
  return (content.match(PROCESS_ENV_COUNT_PATTERN) ?? []).length;
}

/**
 * True when `content` reads `process.env.PORT` and never mentions
 * `parseInt` — the port would stay a string.
 */
export function needsPortParsing(content: string): boolean {
  return hasPattern(content, PORT_ENV_VAR) && !hasPattern(content, PARSE_INT);
}

/** Whether `content` has `const { … } = process.env`. */
export function hasDestructuring(content: string): boolean {
  return PROCESS_ENV_DESTRUCTURING.test(content);
}

/**
 * Whether `content` holds a mongodb://, mysql://, postgresql:// or
 * redis:// connection string. hasAnyRegexPattern starts every search at
 * 0, so an earlier call (another file, another law) does not matter (#487).
 */
export function matchesAnyDbPattern(content: string): boolean {
  return hasAnyRegexPattern(content, DB_CONNECTION_PATTERNS);
}

/**
 * Whether `content` has a quoted `api_key`, `token` or `secret` key
 * assigned a quoted value of 20+ characters (case-insensitive), whatever
 * earlier calls matched (#487).
 */
export function matchesAnySecretPattern(content: string): boolean {
  return hasAnyRegexPattern(content, SECRET_PATTERNS);
}
