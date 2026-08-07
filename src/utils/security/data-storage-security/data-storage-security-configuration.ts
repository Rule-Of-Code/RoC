/**
 * Data Storage Security Configuration
 * Centralized configuration for data storage security analysis patterns and messages
 */

import { PatternMatchingUtils } from '../../pattern-matching-utils';

/**
 * File storage analysis result
 */
export interface FileStorageAnalysis {
  hasFileWrite: boolean;
  hasInsecurePermissions: boolean;
  hasTempFiles: boolean;
  hasPathTraversal: boolean;
  hasPathProtection: boolean;
  hasFileUpload: boolean;
  hasUploadValidation: boolean;
}

/**
 * Cookie security analysis result
 */
export interface CookieSecurityAnalysis {
  hasCookieUsage: boolean;
  hasSecureFlag: boolean;
  hasHttpOnlyFlag: boolean;
  hasSameSite: boolean;
}

/**
 * Validation result structure
 */
export interface DataStorageValidationResult {
  violations: string[];
  suggestions: string[];
  score?: number;
}

export class DataStorageSecurityConfiguration {
  // ===================
  // FILE OPERATION PATTERNS
  // ===================
  static readonly FILE_PATTERNS = {
    WRITE_OPERATIONS: ['fs.writeFileSync', 'fs.writeFile'],
    INSECURE_PERMISSIONS: ['0o777', '777'],
    TEMP_PATHS: ['/tmp/', 'temp'],
    PATH_JOIN: ['path.join'],
    PATH_PROTECTION: ['path.normalize', 'path.resolve'],
    UPLOAD_INDICATORS: ['multer', 'upload'],
    UPLOAD_VALIDATION: ['fileFilter', 'limits'],
    USER_INPUT: ['req.', 'input'],
  } as const;

  // ===================
  // COOKIE PATTERNS
  // ===================
  static readonly COOKIE_PATTERNS = {
    COOKIE_USAGE: ['cookie', 'express'],
    SECURE_FLAG: 'secure: true',
    HTTP_ONLY_FLAG: 'httpOnly: true',
    SAME_SITE: 'sameSite',
  } as const;

  // ===================
  // DATABASE PATTERNS
  // ===================
  static readonly DATABASE_PATTERNS = {
    DATABASE_URL: 'DATABASE_URL',
    SSL_ENABLED: 'ssl=true',
  } as const;

  // ===================
  // VALIDATION MESSAGES
  // ===================
  static readonly VALIDATION_MESSAGES = {
    // Violations
    INSECURE_PERMISSIONS_VIOLATION:
      '{filePath}: Overly permissive file permissions (777)',
    PATH_TRAVERSAL_VIOLATION:
      '{filePath}: Potential path traversal vulnerability',

    // Suggestions
    RESTRICTIVE_PERMISSIONS_SUGGESTION:
      'Use restrictive file permissions (e.g., 0o600 for sensitive files)',
    TEMP_FILES_SUGGESTION:
      'Ensure temporary files are securely created and cleaned up',
    PATH_SANITIZATION_SUGGESTION:
      'Validate and sanitize file paths to prevent directory traversal',
    UPLOAD_VALIDATION_SUGGESTION:
      'Implement file type validation and size limits for uploads',
    DATABASE_SSL_SUGGESTION: 'Enable SSL/TLS for database connections',
    COOKIE_SECURE_SUGGESTION: 'Enable secure flag for cookies',
    COOKIE_HTTP_ONLY_SUGGESTION: 'Enable httpOnly flag for cookies',
    COOKIE_SAME_SITE_SUGGESTION: 'Set sameSite attribute for cookies',
    ANALYSIS_ERROR_SUGGESTION: 'Unable to analyze data storage security',
  } as const;

  // ===================
  // RECOMMENDATIONS
  // ===================
  static readonly RECOMMENDATIONS = [
    'Encrypt sensitive data at rest and in transit',
    'Use environment variables for database credentials',
    'Implement proper access controls for stored data',
    'Use secure cookie attributes (Secure, HttpOnly, SameSite)',
    'Validate and sanitize all file paths',
    'Implement data retention and deletion policies',
    'Use parameterized queries to prevent SQL injection',
    'Enable SSL/TLS for all database connections',
  ] as const;

  // ===================
  // SECURE PATTERNS INFO
  // ===================
  static readonly SECURE_PATTERNS = {
    recommended: [
      'Encrypted localStorage/sessionStorage',
      'Environment variables for secrets',
      'Parameterized database queries',
      'SSL/TLS database connections',
      'Restrictive file permissions',
      'Secure cookie attributes',
    ],
    insecure: [
      'Plaintext sensitive data storage',
      'Hardcoded database credentials',
      'SQL string concatenation',
      'Unencrypted database connections',
      'Overly permissive file permissions',
      'Cookies without security flags',
    ],
  } as const;

  // ===================
  // LIMITS
  // ===================
  static readonly LIMITS = {
    MAX_FILES_TO_ANALYZE: 50,
    MAX_CONFIG_FILES: 20,
    SCORE_PENALTY_PER_VIOLATION: 5,
    MAX_RECOMMENDATIONS: 3,
  } as const;

  // ===================
  // FILE STORAGE ANALYSIS
  // ===================
  static analyzeFileStorage(content: string): FileStorageAnalysis {
    const hasFileWrite = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.WRITE_OPERATIONS
    );

    const hasInsecurePermissions = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.INSECURE_PERMISSIONS
    );

    const hasTempFiles = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.TEMP_PATHS
    );

    const hasPathJoin = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.PATH_JOIN
    );
    const hasUserInput = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.USER_INPUT
    );

    // Only flag path traversal if user input is DIRECTLY used in path operations WITHOUT protection
    // Don't flag every file that uses path.join or req.
    const hasPathTraversal =
      hasPathJoin &&
      hasUserInput &&
      !PatternMatchingUtils.hasAnyPattern(
        content,
        this.FILE_PATTERNS.PATH_PROTECTION
      );

    const hasPathProtection = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.PATH_PROTECTION
    );

    const hasFileUpload = PatternMatchingUtils.hasAnyPattern(
      content,
      this.FILE_PATTERNS.UPLOAD_INDICATORS
    );

    const hasUploadValidation = PatternMatchingUtils.hasAllPatterns(
      content,
      this.FILE_PATTERNS.UPLOAD_VALIDATION
    );

    return {
      hasFileWrite,
      hasInsecurePermissions,
      hasTempFiles,
      hasPathTraversal,
      hasPathProtection,
      hasFileUpload,
      hasUploadValidation,
    };
  }

  // ===================
  // COOKIE SECURITY ANALYSIS
  // ===================
  static analyzeCookieSecurity(content: string): CookieSecurityAnalysis {
    const hasCookieUsage = PatternMatchingUtils.hasAllPatterns(
      content,
      this.COOKIE_PATTERNS.COOKIE_USAGE
    );

    const hasSecureFlag = PatternMatchingUtils.hasPattern(
      content,
      this.COOKIE_PATTERNS.SECURE_FLAG
    );

    const hasHttpOnlyFlag = PatternMatchingUtils.hasPattern(
      content,
      this.COOKIE_PATTERNS.HTTP_ONLY_FLAG
    );

    const hasSameSite = PatternMatchingUtils.hasPattern(
      content,
      this.COOKIE_PATTERNS.SAME_SITE
    );

    return {
      hasCookieUsage,
      hasSecureFlag,
      hasHttpOnlyFlag,
      hasSameSite,
    };
  }

  // ===================
  // DATABASE SECURITY CHECK
  // ===================
  static checkDatabaseSSL(envContent: string): boolean {
    const hasDbUrl = PatternMatchingUtils.hasPattern(
      envContent,
      this.DATABASE_PATTERNS.DATABASE_URL
    );
    const hasSSL = PatternMatchingUtils.hasPattern(
      envContent,
      this.DATABASE_PATTERNS.SSL_ENABLED
    );
    return hasDbUrl && !hasSSL;
  }
}
