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

export const PROCESS_ENV_PATTERN = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
export const PROCESS_ENV_PREFIX = 'process.env.';
export const PROCESS_ENV_DESTRUCTURING = /const\s+{[^}]+}\s*=\s*process\.env/;

export const FALLBACK_INDICATORS = ['||', '??', '? ', 'default'] as const;

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

export const URL_PATTERNS = [
  /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /'https?:\/\/[^']+'/g,
  /"https?:\/\/[^"]+"/g,
] as const;

export const LOCAL_HOST_INDICATORS = ['localhost', '127.0.0.1'] as const;

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

export function createEmptyResult(): EnvUsageCheckResult {
  return { violations: [], suggestions: [] };
}

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

export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

export function extractEnvVarName(match: string): string {
  return match.replace(PROCESS_ENV_PREFIX, '');
}

export function getContextAround(
  content: string,
  match: string,
  before = 50,
  after = 100
): string {
  const matchIndex = content.indexOf(match);
  if (matchIndex === -1) return '';

  const contextStart = Math.max(0, matchIndex - before);
  const contextEnd = Math.min(content.length, matchIndex + after);
  return content.substring(contextStart, contextEnd);
}

export function hasFallbackValue(context: string): boolean {
  return hasAnyPattern(context, FALLBACK_INDICATORS);
}

export function hasValidationLibrary(content: string): boolean {
  return hasAnyPattern(content, VALIDATION_LIBRARIES);
}

export function hasEnvironmentIndicators(content: string): boolean {
  return hasAnyPattern(content, ENVIRONMENT_INDICATORS);
}

export function hasNodeEnv(content: string): boolean {
  return hasPattern(content, NODE_ENV);
}

export function hasProcessEnv(content: string): boolean {
  return hasPattern(content, PROCESS_ENV);
}

export function countEnvUsage(content: string): number {
  return (content.match(PROCESS_ENV_COUNT_PATTERN) ?? []).length;
}

export function needsPortParsing(content: string): boolean {
  return hasPattern(content, PORT_ENV_VAR) && !hasPattern(content, PARSE_INT);
}

export function hasDestructuring(content: string): boolean {
  return PROCESS_ENV_DESTRUCTURING.test(content);
}

export function isLocalUrl(url: string): boolean {
  return hasAnyPattern(url, LOCAL_HOST_INDICATORS);
}

export function matchesAnyDbPattern(content: string): boolean {
  return hasAnyRegexPattern(content, DB_CONNECTION_PATTERNS);
}

export function matchesAnySecretPattern(content: string): boolean {
  return hasAnyRegexPattern(content, SECRET_PATTERNS);
}

export function findAllEnvMatches(content: string): string[] {
  const matches = content.match(PROCESS_ENV_PATTERN);
  return matches ?? [];
}

export function findUrlMatches(content: string): string[] {
  return URL_PATTERNS.flatMap(pattern => content.match(pattern) ?? []);
}

export function filterNonLocalUrls(urls: string[]): string[] {
  return urls.filter(url => !isLocalUrl(url));
}
