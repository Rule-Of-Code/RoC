/**
 * Environment Variables Security Law
 * Ensures no production secrets are committed to version control
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { readPublishableFiles } from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { SecretManagementAnalyzer } from '../../utils/security/secret-management';
import { SecurityLawBase } from './security-law-base';
export class EnvironmentVariablesLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Environment files to check
    const envFiles = [
      'environment.ts',
      'environment.prod.ts',
      'environment.development.ts',
      '.env',
      '.env.local',
      '.env.production',
      'config.ts',
      'config.json',
    ];

    // A secret is a finding where git can publish it: tracked (read from the
    // index), or present and not ignored. An ignored local `.env` — or an
    // ignored `environment.ts` generated from a committed template — is the
    // setup this law asks for, not a leak.
    for (const { file, content } of readPublishableFiles(
      context.projectRoot,
      envFiles
    )) {
      this.checkFileForSecrets(content, file, violations, suggestions);
    }

    // Check if proper template files exist
    const templateFiles = [
      'environment.template.ts',
      'config.template.ts',
      '.env.example',
      '.env.template',
    ];

    let hasTemplate = false;
    for (const templateFile of templateFiles) {
      if (
        FileUtils.exists(PathOperations.join(context.projectRoot, templateFile))
      ) {
        hasTemplate = true;
        break;
      }
    }

    if (
      !hasTemplate &&
      envFiles.some(f =>
        FileUtils.exists(PathOperations.join(context.projectRoot, f))
      )
    ) {
      violations.push(
        'No environment template file found (e.g., environment.template.ts, .env.example)'
      );
      suggestions.push('Create environment template files for documentation');
    }

    return SecurityLawBase.createResult(
      violations,
      'Environment Variables Policy',
      'SECURITY',
      suggestions
    );
  }

  private static checkFileForSecrets(
    content: string,
    envFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const secretPatterns = [
      /api[_-]?key\s*[=:]\s*["'][^"']{10,}["']/gi,
      /password\s*[=:]\s*["'][^"']{5,}["']/gi,
      /secret\s*[=:]\s*["'][^"']{10,}["']/gi,
      /token\s*[=:]\s*["'][^"']{20,}["']/gi,
      /AIza[0-9A-Za-z\\-_]{35}/gi, // Google API keys
      /sk-[a-zA-Z0-9]{20,50}/gi, // OpenAI keys
    ];

    const placeholderPatterns = [
      /YOUR_[A-Z_]+/gi,
      /PLACEHOLDER_[A-Z_]+/gi,
      /your-[a-z-]+/gi,
      /<.*>/gi, // <YOUR_API_KEY>
      /example[_-]?[a-z]*/gi,
    ];

    for (const pattern of secretPatterns) {
      const matches = content.match(pattern);
      if (matches && !this.isPlaceholder(matches, placeholderPatterns)) {
        violations.push(
          `Potential secret found in ${envFile}: ${matches[0].substring(0, 30)}...`
        );
        suggestions.push(
          ...SecretManagementAnalyzer.getSecretManagementRecommendations()
        );
        suggestions.push(
          `Move secrets from ${envFile} to environment variables`
        );
      }
    }
  }

  private static isPlaceholder(
    matches: string[],
    placeholderPatterns: RegExp[]
  ): boolean {
    return matches.some(match =>
      placeholderPatterns.some(ph => ph.test(match))
    );
  }
}
