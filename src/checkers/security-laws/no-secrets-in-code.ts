/**
 * No Secrets in Code Law
 * Prevents hardcoded secrets, API keys, passwords in source code
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileFilterUtils } from '../../utils/file-filter-utils';
import { FileUtils } from '../../utils/file-utils';
import { GlobUtils } from '../../utils/glob-utils';
import { PathOperations } from '../../utils/path-operations';
import { SecretManagementAnalyzer } from '../../utils/security/secret-management';
import { SecurityLawBase } from './security-law-base';
interface ScanParams {
  violations: string[];
  suggestions: string[];
  secretPatterns: RegExp[];
  safePatterns: RegExp[];
}

export class NoSecretsInCodeLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // More comprehensive secret patterns
    const secretPatterns = [
      /api[_-]?key\s*[=:]\s*["'][^"']{10,}["']/gi,
      /password\s*[=:]\s*["'][^"']{5,}["']/gi,
      /secret\s*[=:]\s*["'][^"']{10,}["']/gi,
      /token\s*[=:]\s*["'][^"']{20,}["']/gi,
      /private[_-]?key\s*[=:]\s*["'][^"']{20,}["']/gi,
      /access[_-]?token\s*[=:]\s*["'][^"']{20,}["']/gi,
      /bearer\s+[a-zA-Z0-9_-]{20,}/gi,
      // Specific service patterns
      /AIza[0-9A-Za-z\\-_]{35}/gi, // Google API keys
      /sk-[a-zA-Z0-9]{20,50}/gi, // OpenAI keys
      /ghp_[a-zA-Z0-9]{36}/gi, // GitHub tokens
      /xoxb-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/gi, // Slack tokens
    ];

    // Safe patterns to ignore
    const safePatterns = [
      /YOUR_[A-Z_]+/gi,
      /PLACEHOLDER_[A-Z_]+/gi,
      /your-[a-z-]+/gi,
      /<.*>/gi,
      /example[_-]?[a-z]*/gi,
      /test[_-]?(secret|password|token|key)/gi,
      /demo[_-]?(secret|password|token|key)/gi,
      /fake[_-]?(secret|password|token|key)/gi,
    ];

    // Files to scan
    const sourceFiles = this.getSourceFiles(
      context.projectRoot,
      context.config
    );

    for (const file of sourceFiles) {
      try {
        const content = FileUtils.readFile(file);
        this.scanFileForSecrets(content, file, context, {
          violations,
          suggestions,
          secretPatterns,
          safePatterns,
        });
      } catch (_error) {
        // Skip files that can't be read
        continue;
      }
    }

    suggestions.push(
      ...SecretManagementAnalyzer.getSecretManagementRecommendations()
    );

    return SecurityLawBase.createResult(
      violations,
      'No Secrets in Code Policy',
      'SECURITY',
      suggestions
    );
  }

  private static getSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig | undefined
  ): string[] {
    // Create a basic config if none provided
    const patterns = GlobUtils.getFilePatterns();
    const defaultConfig: Partial<RuleOfCodeConfig> = {
      ignorePatterns: config
        ? FileFilterUtils.getIgnorePatterns(config)
        : ['node_modules/**', 'dist/**', 'build/**'],
      includePatterns: [
        ...patterns.typescript,
        ...patterns.javascript,
        ...patterns.config,
      ],
    };

    const safeConfig = config ?? (defaultConfig as RuleOfCodeConfig);

    // Use CheckerUtils to find source files with proper ignore handling
    const tsFiles = CheckerUtils.findTypeScriptFiles(projectRoot, safeConfig);
    const jsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().JAVASCRIPT,
      safeConfig
    );
    const jsonFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.json'], // Only JSON files for secrets scanning
      safeConfig
    );
    const yamlFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.yml', '.yaml'], // YAML config files for secrets scanning
      safeConfig
    );

    return [...tsFiles, ...jsFiles, ...jsonFiles, ...yamlFiles];
  }

  private static scanFileForSecrets(
    content: string,
    file: string,
    context: LawCheckContext,
    params: ScanParams
  ): void {
    for (const pattern of params.secretPatterns) {
      const matches = content.match(pattern);
      if (matches && !this.isSafePattern(matches, params.safePatterns)) {
        const relativePath = PathOperations.getRelative(
          context.projectRoot,
          file
        );
        params.violations.push(
          `Potential secret in ${relativePath}: ${matches[0].substring(0, 30)}...`
        );
        params.suggestions.push(
          ...SecretManagementAnalyzer.getSecretManagementRecommendations()
        );
      }
    }
  }

  private static isSafePattern(
    matches: string[],
    safePatterns: RegExp[]
  ): boolean {
    return matches.some(match => safePatterns.some(safe => safe.test(match)));
  }
}
