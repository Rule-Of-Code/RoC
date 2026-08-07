/**
 * Cryptographic Libraries Configuration
 * Centralized configuration for cryptographic library analysis patterns and messages
 */

import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { StringTemplateUtils } from '../../string-template-utils';

/**
 * Package.json structure for crypto analysis
 */
export interface CryptoPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Validation result structure
 */
export interface CryptoValidationResult {
  violations: string[];
  suggestions: string[];
}

/**
 * Analysis result for crypto patterns
 */
export interface CryptoPatternAnalysis {
  hasWeakHashAlgorithm: boolean;
  hasDeprecatedCipher: boolean;
  hasRandomBytes: boolean;
  hasCustomCrypto: boolean;
  hasCryptoImport: boolean;
}

/**
 * Pattern check configuration for data-driven validation
 */
export interface PatternCheck {
  condition: keyof CryptoPatternAnalysis;
  violationKey: string | null;
  suggestionKey: string;
  hasFilePath: boolean;
  requiresCryptoImport: boolean;
}

/**
 * Library analysis result
 */
export interface CryptoLibraryAnalysis {
  outdatedLibraries: string[];
  hasRecommendedLib: boolean;
  hasCryptoRelatedDeps: boolean;
  hasNativeCrypto: boolean;
}

export class CryptographicLibrariesConfiguration {
  // ===================
  // OUTDATED LIBRARIES
  // ===================
  static readonly OUTDATED_LIBRARIES = [
    'crypto-js',
    'node-forge',
    'jsrsasign',
  ] as const;

  // ===================
  // RECOMMENDED LIBRARIES
  // ===================
  static readonly RECOMMENDED_LIBRARIES = [
    'bcrypt',
    'argon2',
    'jose',
    '@noble/curves',
    '@noble/hashes',
  ] as const;

  // ===================
  // NATIVE CRYPTO MODULES
  // ===================
  static readonly NATIVE_CRYPTO_MODULES = ['crypto', 'node:crypto'] as const;

  // ===================
  // CRYPTO IMPORT PATTERNS
  // ===================
  static readonly CRYPTO_IMPORT_PATTERNS = [
    /import.*from\s+['"]crypto['"];?/,
    /import.*from\s+['"]node:crypto['"];?/,
    /import.*from\s+['"]crypto-js['"];?/,
    /require\(['"]crypto['"]\)/,
    /require\(['"]node:crypto['"]\)/,
  ] as const;

  /**
   * A recognised, vetted crypto facility — not home-rolled. Beyond the Node
   * imports above: WebCrypto (`crypto.subtle`), and the common libraries a file
   * named `decryptToken()` is usually calling. Used to STOP flagging legitimate
   * crypto as "custom".
   */
  static readonly RECOGNIZED_CRYPTO_PATTERNS = [
    ...CryptographicLibrariesConfiguration.CRYPTO_IMPORT_PATTERNS,
    /crypto\.subtle\b/,
    /\bwebcrypto\b/i,
    /from\s+['"](tweetnacl|libsodium[-\w]*|sodium[-\w]*|bcryptjs?|argon2|@noble\/[\w-]+|jose|jsonwebtoken|node-forge|jsrsasign)['"]/,
    /require\(['"](tweetnacl|libsodium[-\w]*|sodium[-\w]*|bcryptjs?|argon2|@noble\/[\w-]+|jose|jsonwebtoken|node-forge|jsrsasign)['"]\)/,
  ] as const;

  /**
   * Home-rolled crypto actually manipulates bytes/characters: an encrypt/decrypt
   * function that XORs, shifts, or walks char codes. Merely mentioning the word
   * "encrypt" (a call to a library, a variable name, a comment) is NOT home-rolled
   * — that was the false positive.
   */
  static readonly HOME_ROLLED_CRYPTO_PATTERNS = [
    /(en|de)crypt\w*\s*(?::[^=]*)?=?\s*(?:async\s*)?(?:function|\([^)]*\)\s*(?:=>|\{))[\s\S]{0,500}?(charCodeAt|fromCharCode|\^=?|>>>?|<<|&\s*0x[0-9a-f]+)/i,
    /(charCodeAt|fromCharCode)[\s\S]{0,200}?(en|de)crypt/i,
  ] as const;

  // ===================
  // WEAK ALGORITHM PATTERNS
  // ===================
  static readonly WEAK_ALGORITHMS = {
    HASH_ALGORITHMS: ['md5', 'sha1'],
    DEPRECATED_FUNCTIONS: ['createCipher'],
    CUSTOM_CRYPTO_INDICATORS: ['encrypt', 'decrypt'],
  } as const;

  // ===================
  // CRYPTO FUNCTION NAMES
  // ===================
  static readonly CRYPTO_FUNCTIONS = {
    CREATE_HASH: 'createHash',
    RANDOM_BYTES: 'randomBytes',
  } as const;

  // ===================
  // CRYPTO KEYWORDS FOR DEPENDENCY CHECK
  // ===================
  static readonly CRYPTO_KEYWORDS = ['crypt', 'hash', 'cipher'] as const;

  // ===================
  // VALIDATION MESSAGES
  // ===================
  static readonly VALIDATION_MESSAGES = {
    // Violations
    OUTDATED_LIBRARY_VIOLATION:
      'Potentially outdated crypto library: {library}',
    WEAK_HASH_VIOLATION: '{filePath}: Using weak hash algorithms (MD5/SHA1)',
    DEPRECATED_CIPHER_VIOLATION:
      '{filePath}: createCipher is deprecated, use createCipherGCM or createCipherGCM',
    CUSTOM_CRYPTO_VIOLATION:
      '{filePath}: Custom crypto implementation detected without proper library',

    // Suggestions
    OUTDATED_LIBRARY_SUGGESTION:
      'Consider updating {library} or using native crypto APIs',
    WEAK_HASH_SUGGESTION: 'Use SHA-256 or stronger hash algorithms',
    DEPRECATED_CIPHER_SUGGESTION:
      'Use createCipherGCM for authenticated encryption',
    RANDOM_BYTES_SUGGESTION:
      'Ensure randomBytes length is appropriate for your use case (minimum 16 bytes for keys)',
    RECOMMENDED_LIBRARY_SUGGESTION:
      'Consider using well-audited cryptographic libraries like bcrypt, argon2, or @noble packages',
    NATIVE_CRYPTO_SUGGESTION:
      'Consider using Node.js built-in crypto module for basic cryptographic operations',
    CUSTOM_CRYPTO_SUGGESTION:
      'Use established cryptographic libraries instead of custom implementations',
  } as const;

  // ===================
  // PATTERN CHECKS CONFIG (Data-Driven)
  // ===================
  static readonly ALL_PATTERN_CHECKS: PatternCheck[] = [
    // Checks that require hasCryptoImport
    {
      condition: 'hasWeakHashAlgorithm',
      violationKey: 'WEAK_HASH_VIOLATION',
      suggestionKey: 'WEAK_HASH_SUGGESTION',
      hasFilePath: true,
      requiresCryptoImport: true,
    },
    {
      condition: 'hasDeprecatedCipher',
      violationKey: 'DEPRECATED_CIPHER_VIOLATION',
      suggestionKey: 'DEPRECATED_CIPHER_SUGGESTION',
      hasFilePath: true,
      requiresCryptoImport: true,
    },
    {
      condition: 'hasRandomBytes',
      violationKey: null,
      suggestionKey: 'RANDOM_BYTES_SUGGESTION',
      hasFilePath: false,
      requiresCryptoImport: true,
    },
    // Standalone checks (no crypto import required)
    {
      condition: 'hasCustomCrypto',
      violationKey: 'CUSTOM_CRYPTO_VIOLATION',
      suggestionKey: 'CUSTOM_CRYPTO_SUGGESTION',
      hasFilePath: true,
      requiresCryptoImport: false,
    },
  ];

  // ===================
  // RECOMMENDATIONS
  // ===================
  static readonly RECOMMENDATIONS = [
    'Use Node.js built-in crypto module for basic operations',
    'Use bcrypt or argon2 for password hashing',
    'Use @noble packages for modern cryptographic primitives',
    'Avoid deprecated crypto functions like createCipher',
    'Keep cryptographic libraries updated to latest versions',
    'Audit third-party crypto libraries regularly',
    'Use well-established libraries over custom implementations',
  ] as const;

  // ===================
  // SECURE PATTERNS
  // ===================
  static readonly SECURE_PATTERNS = {
    recommended: [
      'crypto.randomBytes()',
      'crypto.pbkdf2()',
      'crypto.scrypt()',
      'crypto.createCipherGCM()',
      'crypto.createHash("sha256")',
      'bcrypt.hash()',
      'argon2.hash()',
    ],
    avoid: [
      'Math.random()',
      'crypto.createCipher()',
      'crypto.createHash("md5")',
      'crypto.createHash("sha1")',
      'btoa()/atob() for sensitive data',
      'Custom encryption implementations',
    ],
  } as const;

  // ===================
  // MESSAGE BUILDING
  // ===================
  static buildMessage(
    template: string,
    params: Record<string, number | string>
  ): string {
    return StringTemplateUtils.formatNamedTemplate(template, params);
  }

  // ===================
  // PATTERN ANALYSIS
  // ===================
  static analyzeCryptoPatterns(content: string): CryptoPatternAnalysis {
    const hasCryptoImport = PatternMatchingUtils.hasAnyRegexPattern(
      content,
      this.CRYPTO_IMPORT_PATTERNS
    );

    const hasCreateHash = PatternMatchingUtils.hasPattern(
      content,
      this.CRYPTO_FUNCTIONS.CREATE_HASH
    );
    const hasWeakHashAlgorithm =
      hasCreateHash &&
      PatternMatchingUtils.hasAnyPattern(
        content,
        this.WEAK_ALGORITHMS.HASH_ALGORITHMS
      );

    const hasDeprecatedCipher = PatternMatchingUtils.hasAnyPattern(
      content,
      this.WEAK_ALGORITHMS.DEPRECATED_FUNCTIONS
    );

    const hasRandomBytes = PatternMatchingUtils.hasPattern(
      content,
      this.CRYPTO_FUNCTIONS.RANDOM_BYTES
    );

    // Home-rolled crypto = an actual byte/char-manipulating implementation with
    // no recognised crypto facility present. It used to be "the word encrypt or
    // decrypt appears and no Node crypto import" — which flagged WebCrypto, a call
    // to a third-party lib's decryptToken(), and even a comment.
    const hasRecognizedCrypto = PatternMatchingUtils.hasAnyRegexPattern(
      content,
      this.RECOGNIZED_CRYPTO_PATTERNS
    );
    const hasCustomCrypto =
      !hasRecognizedCrypto &&
      PatternMatchingUtils.hasAnyRegexPattern(
        content,
        this.HOME_ROLLED_CRYPTO_PATTERNS
      );

    return {
      hasWeakHashAlgorithm,
      hasDeprecatedCipher,
      hasRandomBytes,
      hasCustomCrypto,
      hasCryptoImport,
    };
  }

  // ===================
  // LIBRARY ANALYSIS
  // ===================
  static analyzeCryptoLibraries(
    dependencies: Record<string, string>
  ): CryptoLibraryAnalysis {
    const hasDep = (lib: string): boolean => Boolean(dependencies[lib]);

    const outdatedLibraries = this.OUTDATED_LIBRARIES.filter(hasDep);

    const hasRecommendedLib = this.RECOMMENDED_LIBRARIES.some(hasDep);

    const hasCryptoRelatedDeps = Object.keys(dependencies).some(dep =>
      PatternMatchingUtils.hasAnyPattern(dep, this.CRYPTO_KEYWORDS)
    );

    const hasNativeCrypto = this.NATIVE_CRYPTO_MODULES.some(hasDep);

    return {
      outdatedLibraries: [...outdatedLibraries],
      hasRecommendedLib,
      hasCryptoRelatedDeps,
      hasNativeCrypto,
    };
  }
}
