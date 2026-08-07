/**
 * Encryption Implementation Validation Patterns
 * Validation workflow for encryption implementation analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { scanAndAnalyzeFiles } from '../file-scanning-helper';
import * as Config from './encryption-implementation-configuration';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Remove comments from code to avoid false positives
 */
function removeComments(content: string): string {
  // Remove single-line comments
  let result = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateEncryptionImplementation(
  projectRoot: string,
  config: RuleOfCodeConfig
): Config.EncryptionCheckResult {
  const results = scanAndAnalyzeFiles(
    projectRoot,
    config,
    (file, content) =>
      Config.mergeResults(
        checkWeakEncryption(content, file),
        checkEncryptionUsage(content, file),
        checkKeyManagement(content, file)
      ),
    () => Config.createEmptyResult(),
    Config.safeReadFile
  );

  return Config.mergeResults(...results);
}

// ============================================================================
// Weak Encryption Checks
// ============================================================================

function checkWeakEncryption(
  content: string,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for weak encryption algorithms
  checkWeakAlgorithms(content, filePath, result);

  // Check for hardcoded secrets
  checkHardcodedSecrets(content, filePath, result);

  // Check for base64 misuse
  checkBase64Misuse(content, filePath, result);

  return result;
}

function checkWeakAlgorithms(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Remove comments to avoid false positives
  const codeOnly = removeComments(content);

  Config.WEAK_ALGORITHMS.forEach(algorithm => {
    // Use word boundary regex for precise matching
    const wordBoundaryRegex = new RegExp(`\\b${algorithm}\\b`, 'i');
    if (wordBoundaryRegex.test(codeOnly)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.weakAlgorithm, {
          filePath,
          algorithm,
        })
      );
      result.suggestions.push(
        Config.formatMessage(
          Config.VALIDATION_MESSAGES.weakAlgorithmSuggestion,
          {
            algorithm,
          }
        )
      );
    }
  });
}

function checkHardcodedSecrets(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Remove comments to avoid false positives
  const codeOnly = removeComments(content);

  // Ignore Stripe test/publishable keys (public by design)
  const isStripePublicKey = /pk_test_|pk_live_/.test(codeOnly);
  if (isStripePublicKey) {
    return; // Stripe publishable keys are safe to commit
  }

  // Ignore safe key constant names (STORAGE_KEY, CONSENT_KEY, etc.)
  const hasSafeKeyPattern = Config.hasAnyRegexPattern(
    codeOnly,
    Config.SAFE_KEY_PATTERNS
  );
  if (hasSafeKeyPattern) {
    return; // These are key names, not actual secrets
  }

  if (Config.hasAnyRegexPattern(codeOnly, Config.HARDCODED_SECRET_PATTERNS)) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.hardcodedSecret, {
        filePath,
      })
    );
    result.suggestions.push(
      Config.VALIDATION_MESSAGES.hardcodedSecretSuggestion
    );
  }
}

function checkBase64Misuse(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Remove comments to avoid false positives
  const codeOnly = removeComments(content);

  if (!Config.hasAnyPattern(codeOnly, Config.BASE64_FUNCTIONS)) {
    return;
  }

  // Check if used for legitimate purposes (fingerprinting, data URLs, transmission)
  const legitimateUses = [
    'fingerprint',
    'identifier',
    'clientId',
    'data:', // Data URLs
    'Content-Type', // HTTP headers
    'userAgent', // UA fingerprinting
    'screen', // Screen fingerprinting
  ];

  const hasLegitimateUse = legitimateUses.some(use =>
    codeOnly.toLowerCase().includes(use.toLowerCase())
  );

  // Check if used with sensitive keywords (password, secret, token)
  const sensitiveKeywords = [
    'password',
    'secret',
    'token',
    'key',
    'credential',
  ];
  const hasSensitiveContext = sensitiveKeywords.some(keyword =>
    codeOnly.toLowerCase().includes(keyword)
  );

  // Only flag if used with sensitive data and not for legitimate purposes
  if (hasSensitiveContext && !hasLegitimateUse) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.base64NotEncryption, {
        filePath,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.base64Suggestion);
  }
}

// ============================================================================
// Encryption Usage Checks
// ============================================================================

function checkEncryptionUsage(
  content: string,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for HTTP connections
  checkHttpConnections(content, filePath, result);

  // Check for API calls without SSL
  checkApiCallsSecurity(content, result);

  // Check for sensitive data in browser storage
  checkBrowserStorageSecurity(content, filePath, result);

  return result;
}

function checkHttpConnections(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  if (Config.hasInsecureHttp(content)) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.httpConnection, {
        filePath,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.httpSuggestion);
  }
}

function checkApiCallsSecurity(
  content: string,
  result: Config.EncryptionCheckResult
): void {
  const hasApiCalls = Config.hasAnyPattern(content, Config.API_CALL_PATTERNS);
  const hasSSL = Config.hasAnyPattern(content, Config.SSL_INDICATORS);

  if (hasApiCalls && !hasSSL) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.apiCallsSuggestion);
  }
}

function checkBrowserStorageSecurity(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Remove comments to avoid false positives
  const codeOnly = removeComments(content);

  const usesBrowserStorage = Config.hasAnyPattern(
    codeOnly,
    Config.BROWSER_STORAGE_PATTERNS
  );

  if (!usesBrowserStorage) {
    return;
  }

  // Extract actual storage calls to check values, not keys
  const storageRegex =
    /(?:localStorage|sessionStorage)\.setItem\s*\(\s*['"][^'"]*['"]\s*,\s*(['"][^'"]*['"]|[^)]+)\)/g;
  const matches = [...codeOnly.matchAll(storageRegex)];

  for (const match of matches) {
    const value = match[1] || '';
    // Check if the VALUE contains sensitive keywords (not the key name)
    const hasSensitiveValue = Config.SENSITIVE_DATA_KEYWORDS.some(keyword =>
      value.toLowerCase().includes(keyword)
    );

    if (hasSensitiveValue) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.sensitiveInStorage, {
          filePath,
        })
      );
      result.suggestions.push(Config.VALIDATION_MESSAGES.storageSuggestion);
      break; // Only report once per file
    }
  }
}

// ============================================================================
// Key Management Checks
// ============================================================================

function checkKeyManagement(
  content: string,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for key rotation
  checkKeyRotation(content, result);

  // Check for proper key derivation
  checkKeyDerivation(content, filePath, result);

  // Check for secure random generation
  checkSecureRandom(content, filePath, result);

  return result;
}

function checkKeyRotation(
  content: string,
  result: Config.EncryptionCheckResult
): void {
  const usesCrypto = Config.hasAnyPattern(content, Config.CRYPTO_INDICATORS);
  const hasKeyRotation = Config.hasAnyPattern(
    content,
    Config.KEY_ROTATION_INDICATORS
  );

  if (usesCrypto && !hasKeyRotation) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.keyRotationSuggestion);
  }
}

function checkKeyDerivation(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const hasProperDerivation = Config.hasAnyPattern(
    content,
    Config.PROPER_KEY_DERIVATION
  );
  const hasPasswordHashing = Config.hasAllPatterns(
    content,
    Config.PASSWORD_HASH_INDICATORS
  );

  if (!hasProperDerivation && hasPasswordHashing) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.keyDerivation, {
        filePath,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.keyDerivationSuggestion);
  }
}

function checkSecureRandom(
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Remove comments to avoid false positives
  const codeOnly = removeComments(content);

  // Only check actual code for Math.random(), not comments
  if (!Config.hasInsecureRandom(codeOnly)) {
    return;
  }

  // Extract lines containing Math.random()
  const lines = codeOnly.split('\n');
  const mathRandomLines = lines.filter(line => line.includes('Math.random'));

  for (const line of mathRandomLines) {
    // Check if Math.random() is on same line as safe patterns
    const hasSafeContext = Config.SAFE_RANDOM_CONTEXTS.some(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check if Math.random() is used for ID generation (toString(36) pattern)
    const isIdGeneration =
      line.includes('.toString(36)') || line.includes('.toString(');

    // Check if used in crypto context
    const hasCryptoContext = Config.CRYPTO_RANDOM_CONTEXTS.some(keyword =>
      line.toLowerCase().includes(keyword)
    );

    // Only flag if:
    // 1. Used in crypto context, OR
    // 2. Not used for ID generation AND no safe context
    if (hasCryptoContext || (!isIdGeneration && !hasSafeContext)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.insecureRandom, {
          filePath,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.insecureRandomSuggestion
      );
      break; // Only report once per file
    }
  }
}
