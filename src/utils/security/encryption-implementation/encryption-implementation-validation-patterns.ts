/**
 * Encryption Implementation Validation Patterns
 * Validation workflow for encryption implementation analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { loadTypeScript, parserUnavailable } from '../../react/tsx-source';
import { type CodeView, codeMatches, readCodeView } from '../code-view';
import { scanAndAnalyzeFiles } from '../file-scanning-helper';
import * as Config from './encryption-implementation-configuration';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

/**
 * Every file is read through the parse (#426): a detector's own pattern
 * table, the law registry's prose and message strings are not the project's
 * code. Without the parser the files are not read — said so.
 */
export function validateEncryptionImplementation(
  projectRoot: string,
  config: RuleOfCodeConfig
): Config.EncryptionCheckResult {
  const ts = loadTypeScript(projectRoot);
  const results = scanAndAnalyzeFiles(
    projectRoot,
    config,
    (file, content) => {
      if (!ts) return Config.createEmptyResult();
      const view = readCodeView(ts, content, file);
      return Config.mergeResults(
        checkWeakEncryption(view, file),
        checkEncryptionUsage(view, content, file),
        checkKeyManagement(view, content, file)
      );
    },
    () => Config.createEmptyResult(),
    Config.safeReadFile
  );

  const merged = Config.mergeResults(...results);
  if (!ts && results.length > 0) {
    merged.violations.push(
      parserUnavailable(projectRoot, `the ${results.length} .ts/.js file(s)`)
    );
  }
  return merged;
}

// ============================================================================
// Weak Encryption Checks
// ============================================================================

function checkWeakEncryption(
  view: CodeView,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for weak encryption algorithms
  checkWeakAlgorithms(view, filePath, result);

  // Check for hardcoded secrets
  checkHardcodedSecrets(view, filePath, result);

  // Check for base64 misuse
  checkBase64Misuse(view, filePath, result);

  return result;
}

/**
 * A weak algorithm is USED when the code names it — an identifier
 * (`CryptoJS.MD5(…)`, `md5(…)`) — or hands its name to a crypto API
 * (`createHash('md5')`, `{ algorithm: 'des-ede3' }`). The same word in a
 * pattern table, a message or a comment uses nothing.
 */
function checkWeakAlgorithms(
  view: CodeView,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const apiStrings = view.apiStrings(Config.CRYPTO_API_NAME).join('\n');

  Config.WEAK_ALGORITHMS.forEach(algorithm => {
    // Use word boundary regex for precise matching
    const wordBoundaryRegex = new RegExp(`\\b${algorithm}\\b`, 'i');
    if (
      wordBoundaryRegex.test(view.code) ||
      wordBoundaryRegex.test(apiStrings)
    ) {
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

/** A secret is an assignment in code: `password = "…"` written inside a string or a regex is text. */
function checkHardcodedSecrets(
  view: CodeView,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const codeOnly = view.commentless;

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

  // A value that is a dotted property path — `KEY = 'thresholds.next.x'`, a
  // config key or a message id — names something; it is not a secret.
  const secrets = Config.HARDCODED_SECRET_PATTERNS.flatMap(pattern =>
    codeMatches(view, pattern)
  ).filter(match => !Config.NAME_PATH_VALUE.test(match));
  if (secrets.length > 0) {
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
  view: CodeView,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const codeOnly = view.commentless;

  // `btoa(` called in code, not named in a string or a comment.
  if (!Config.hasAnyPattern(view.code, Config.BASE64_FUNCTIONS)) {
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
  view: CodeView,
  content: string,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for HTTP connections
  checkHttpConnections(view, content, filePath, result);

  // Check for API calls without SSL
  checkApiCallsSecurity(content, result);

  // Check for sensitive data in browser storage
  checkBrowserStorageSecurity(view, filePath, result);

  return result;
}

/**
 * An HTTP connection is a string that IS an http:// URL (`'http://api…'`);
 * `'http://'` in a protocol table, a message or a comment connects nowhere.
 * A file that mentions localhost is left alone, as before.
 */
function checkHttpConnections(
  view: CodeView,
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  if (
    view.strings.some(text => Config.INSECURE_HTTP_URL.test(text)) &&
    !Config.hasPattern(content, Config.LOCALHOST_PATTERN)
  ) {
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
  view: CodeView,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const codeOnly = view.commentless;

  const usesBrowserStorage = Config.hasAnyPattern(
    view.code,
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
  view: CodeView,
  content: string,
  filePath: string
): Config.EncryptionCheckResult {
  const result = Config.createEmptyResult();

  // Check for key rotation
  checkKeyRotation(content, result);

  // Check for proper key derivation
  checkKeyDerivation(view, content, filePath, result);

  // Check for secure random generation
  checkSecureRandom(view, filePath, result);

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
  view: CodeView,
  content: string,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  const hasProperDerivation = Config.hasAnyPattern(
    content,
    Config.PROPER_KEY_DERIVATION
  );
  // Password hashing is code that hashes a password: both words in the
  // code (case as before), not in prose about it.
  const hasPasswordHashing = Config.hasAllPatterns(
    view.code,
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
  view: CodeView,
  filePath: string,
  result: Config.EncryptionCheckResult
): void {
  // Only a call in code: 'Math.random' in a pattern table is not one.
  if (!Config.hasInsecureRandom(view.code)) {
    return;
  }

  // The lines that call it, read with their strings (the safe contexts
  // below are often string ids). The views keep line breaks.
  const codeLines = view.code.split('\n');
  const lines = view.commentless.split('\n');
  const mathRandomLines = lines.filter((_, i) =>
    (codeLines[i] ?? '').includes('Math.random')
  );

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
