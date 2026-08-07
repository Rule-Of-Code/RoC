/**
 * Data Storage Security Validation Patterns
 * Orchestrates validation workflow for data storage security analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { CheckerUtils } from '../../checker-utils';
import { FileUtils } from '../../file-utils';
import { StringTemplateUtils } from '../../string-template-utils';
import type { DataStorageValidationResult } from './data-storage-security-configuration';
import { DataStorageSecurityConfiguration as Config } from './data-storage-security-configuration';

// File constants
const ENV_FILE = '.env';

// Cache common extensions to avoid repeated calls
const EXTENSIONS = CheckerUtils.getCommonExtensions();

// Cookie security checks - data-driven approach
const COOKIE_SECURITY_CHECKS = [
  { flag: 'hasSecureFlag', message: 'COOKIE_SECURE_SUGGESTION' },
  { flag: 'hasHttpOnlyFlag', message: 'COOKIE_HTTP_ONLY_SUGGESTION' },
  { flag: 'hasSameSite', message: 'COOKIE_SAME_SITE_SUGGESTION' },
] as const;

/**
 * Helper to safely read file content
 * @returns content or null if unreadable
 */
const safeReadFile = (file: string): string | null => {
  try {
    return FileUtils.readFile(file);
  } catch {
    return null;
  }
};

export class DataStorageSecurityValidationPatterns {
  // ===================
  // MAIN VALIDATION WORKFLOW
  // ===================
  static validateDataStorageSecurity(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): DataStorageValidationResult & { score: number } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    try {
      // Step 1: Analyze source files for storage security
      this.validateSourceFiles(projectRoot, config, violations, suggestions);

      // Step 2: Check database configuration security
      this.validateDatabaseSecurity(projectRoot, suggestions);

      // Step 3: Check cookie security
      this.validateCookieSecurity(projectRoot, config, suggestions);

      // Calculate score
      score = Math.max(
        0,
        score - violations.length * Config.LIMITS.SCORE_PENALTY_PER_VIOLATION
      );

      // Add general recommendations if issues found
      if (violations.length > 0) {
        suggestions.push(
          ...Config.RECOMMENDATIONS.slice(0, Config.LIMITS.MAX_RECOMMENDATIONS)
        );
      }
    } catch {
      suggestions.push(Config.VALIDATION_MESSAGES.ANALYSIS_ERROR_SUGGESTION);
    }

    // Deduplicate violations and suggestions
    return {
      violations: [...new Set(violations)],
      suggestions: [...new Set(suggestions)],
      score,
    };
  }

  // ===================
  // SOURCE FILE VALIDATION
  // ===================
  private static validateSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      EXTENSIONS.ALL_CODE,
      config
    );

    for (const file of files) {
      const content = safeReadFile(file);
      if (content) {
        this.processFileStoragePatterns(content, file, violations, suggestions);
      }
    }
  }

  // ===================
  // FILE STORAGE PATTERN PROCESSING
  // ===================
  private static processFileStoragePatterns(
    content: string,
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = Config.analyzeFileStorage(content);

    // Check file permissions
    if (analysis.hasFileWrite) {
      if (analysis.hasInsecurePermissions) {
        violations.push(
          StringTemplateUtils.formatNamedTemplate(
            Config.VALIDATION_MESSAGES.INSECURE_PERMISSIONS_VIOLATION,
            { filePath }
          )
        );
        suggestions.push(
          Config.VALIDATION_MESSAGES.RESTRICTIVE_PERMISSIONS_SUGGESTION
        );
      }

      if (analysis.hasTempFiles) {
        suggestions.push(Config.VALIDATION_MESSAGES.TEMP_FILES_SUGGESTION);
      }
    }

    // Check path traversal
    if (analysis.hasPathTraversal && !analysis.hasPathProtection) {
      violations.push(
        StringTemplateUtils.formatNamedTemplate(
          Config.VALIDATION_MESSAGES.PATH_TRAVERSAL_VIOLATION,
          { filePath }
        )
      );
      suggestions.push(Config.VALIDATION_MESSAGES.PATH_SANITIZATION_SUGGESTION);
    }

    // Check file upload security
    if (analysis.hasFileUpload && !analysis.hasUploadValidation) {
      suggestions.push(Config.VALIDATION_MESSAGES.UPLOAD_VALIDATION_SUGGESTION);
    }
  }

  // ===================
  // DATABASE SECURITY VALIDATION
  // ===================
  private static validateDatabaseSecurity(
    projectRoot: string,
    suggestions: string[]
  ): void {
    try {
      const envPath = FileUtils.join(projectRoot, ENV_FILE);
      if (FileUtils.exists(envPath)) {
        const envContent = FileUtils.readFile(envPath);
        if (Config.checkDatabaseSSL(envContent)) {
          suggestions.push(Config.VALIDATION_MESSAGES.DATABASE_SSL_SUGGESTION);
        }
      }
    } catch {
      // Skip if can't read env file
    }
  }

  // ===================
  // COOKIE SECURITY VALIDATION
  // ===================
  private static validateCookieSecurity(
    projectRoot: string,
    config: RuleOfCodeConfig,
    suggestions: string[]
  ): void {
    try {
      const configFiles = CheckerUtils.findFilesByExtension(
        projectRoot,
        EXTENSIONS.TYPESCRIPT,
        config
      );

      for (const file of configFiles) {
        const content = safeReadFile(file);
        if (content) {
          this.processCookiePatterns(content, suggestions);
        }
      }
    } catch {
      // Skip if error finding files
    }
  }

  // ===================
  // COOKIE PATTERN PROCESSING
  // ===================
  private static processCookiePatterns(
    content: string,
    suggestions: string[]
  ): void {
    const analysis = Config.analyzeCookieSecurity(content);

    if (analysis.hasCookieUsage) {
      for (const check of COOKIE_SECURITY_CHECKS) {
        if (!analysis[check.flag]) {
          suggestions.push(Config.VALIDATION_MESSAGES[check.message]);
        }
      }
    }
  }
}
