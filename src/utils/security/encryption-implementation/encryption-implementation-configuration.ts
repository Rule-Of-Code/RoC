/**
 * Encryption Implementation Configuration
 * Centralized configuration for encryption implementation analysis
 */

import { FileUtils } from '../../file-utils';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { StringTemplateUtils } from '../../string-template-utils';

// ============================================================================
// Types
// ============================================================================

export interface EncryptionCheckResult {
  violations: string[];
  suggestions: string[];
}

// ============================================================================
// Weak Encryption Patterns
// ============================================================================

export const WEAK_ALGORITHMS = ['MD5', 'SHA1', 'DES', 'RC4'] as const;

export const HARDCODED_SECRET_PATTERNS = [
  /password\s*=\s*["'][^"']+["']/gi,
  /secret\s*=\s*["'][^"']+["']/gi,
  /apikey\s*=\s*["'][^"']+["']/gi,
  // Match key = 'value' but NOT when value looks like a key name (contains _key, _metrics, etc.)
  /\bkey\s*=\s*["'](?!.*(_key|_metrics|_storage|_cache|_consent))[^"']+["']/gi,
] as const;

// Safe key patterns (constant names, not actual secrets)
export const SAFE_KEY_PATTERNS = [
  /_KEY\s*=/i, // Constants ending with _KEY
  /CONSENT_KEY/i, // Cookie consent keys
  /STORAGE_KEY/i, // Storage key names
  /CACHE_KEY/i, // Cache key names
  /COOKIE_KEY/i, // Cookie key names
] as const;

export const BASE64_FUNCTIONS = ['btoa(', 'atob('] as const;

// ============================================================================
// Encryption Usage Patterns
// ============================================================================

export const INSECURE_HTTP_PATTERN = 'http://';
export const LOCALHOST_PATTERN = 'localhost';

export const API_CALL_PATTERNS = ['XMLHttpRequest', 'fetch('] as const;
export const SSL_INDICATORS = ['https://', 'ssl'] as const;

export const BROWSER_STORAGE_PATTERNS = [
  'localStorage.setItem',
  'sessionStorage.setItem',
] as const;

export const SENSITIVE_DATA_KEYWORDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
] as const;

// ============================================================================
// Key Management Patterns
// ============================================================================

export const CRYPTO_INDICATORS = ['crypto', 'encrypt'] as const;
export const KEY_ROTATION_INDICATORS = ['rotate', 'refresh', 'renew'] as const;

export const PROPER_KEY_DERIVATION = ['pbkdf2', 'scrypt', 'argon2'] as const;
export const PASSWORD_HASH_INDICATORS = ['hash', 'password'] as const;

export const INSECURE_RANDOM_PATTERN = 'Math.random';

// Safe contexts where Math.random() is acceptable (not crypto-related)
export const SAFE_RANDOM_CONTEXTS = [
  'inputId', // UI element IDs
  'componentId', // Component identifiers
  'session_', // Session identifiers (non-crypto)
  'test-', // Test data
  'mock-', // Mock data
  'demo-', // Demo data
  'animation', // Animations
  'transition', // Transitions
  'delay', // UI delays
  'jitter', // Network jitter
  'fx-', // Framework component IDs
  '.toString(36', // Base36 encoding for IDs
] as const;

// Crypto contexts where Math.random() is NOT acceptable
export const CRYPTO_RANDOM_CONTEXTS = [
  'token',
  'secret',
  'key',
  'password',
  'salt',
  'nonce',
  'iv',
  'crypto',
  'encrypt',
  'hash',
] as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  // Weak encryption messages
  weakAlgorithm: '{filePath}: Weak encryption algorithm detected: {algorithm}',
  weakAlgorithmSuggestion:
    'Replace {algorithm} with stronger alternatives like SHA-256 or AES',
  hardcodedSecret: '{filePath}: Potential hardcoded secret detected',
  hardcodedSecretSuggestion:
    'Move secrets to environment variables or secure configuration',
  base64NotEncryption: '{filePath}: Base64 encoding is not encryption',
  base64Suggestion: 'Use proper cryptographic functions for sensitive data',

  // Encryption usage messages
  httpConnection: '{filePath}: HTTP connections detected, use HTTPS',
  httpSuggestion: 'Use HTTPS for all external communications',
  apiCallsSuggestion: 'Ensure all API calls use HTTPS/TLS encryption',
  sensitiveInStorage: '{filePath}: Potential sensitive data in browser storage',
  storageSuggestion: 'Encrypt sensitive data before storing in browser storage',

  // Key management messages
  keyRotationSuggestion:
    'Consider implementing key rotation for cryptographic keys',
  keyDerivation: '{filePath}: Consider using proper key derivation functions',
  keyDerivationSuggestion: 'Use PBKDF2, scrypt, or Argon2 for password hashing',
  insecureRandom: '{filePath}: Math.random() is not cryptographically secure',
  insecureRandomSuggestion:
    'Use crypto.randomBytes() or crypto.getRandomValues() for secure random generation',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Use AES-256 for symmetric encryption',
  'Use RSA-2048 or higher for asymmetric encryption',
  'Always use HTTPS/TLS for data transmission',
  'Never hardcode encryption keys or secrets',
  'Implement proper key management and rotation',
  'Use cryptographically secure random number generators',
  'Apply proper key derivation functions for passwords',
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmptyResult(): EncryptionCheckResult {
  return { violations: [], suggestions: [] };
}

import { mergeSecurityResults } from '../result-merging-helper';

export function mergeResults(
  ...results: EncryptionCheckResult[]
): EncryptionCheckResult {
  return mergeSecurityResults(createEmptyResult, ...results);
}

// Pattern matching delegated to PatternMatchingUtils
export const { hasPattern, hasAnyPattern, hasAllPatterns, hasAnyRegexPattern } =
  PatternMatchingUtils;

export function hasSensitiveDataKeyword(content: string): boolean {
  return hasAnyPattern(content.toLowerCase(), SENSITIVE_DATA_KEYWORDS);
}

export function hasInsecureHttp(content: string): boolean {
  return (
    hasPattern(content, INSECURE_HTTP_PATTERN) &&
    !hasPattern(content, LOCALHOST_PATTERN)
  );
}

export function hasInsecureRandom(content: string): boolean {
  return hasPattern(content, INSECURE_RANDOM_PATTERN);
}

export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

// Message formatting delegated to StringTemplateUtils
export const formatMessage = StringTemplateUtils.formatNamedTemplate;
