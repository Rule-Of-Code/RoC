import { PatternMatchingUtils } from "../../../../utils/pattern-matching-utils";

/**
 * SASTConstants
 *
 * Configuration for Static Application Security Testing (SAST).
 * Includes SAST tools, configuration files, and validation patterns.
 */
export class SASTConstants {
  static readonly TOOLS = {
    'eslint-plugin-security': 'ESLint Security',
    '@typescript-eslint/eslint-plugin': 'TypeScript ESLint',
    'tslint-config-security': 'TSLint Security',
    semgrep: 'Semgrep',
    'sonarqube-scanner': 'SonarQube',
    retire: 'Retire.js',
  };

  static readonly CONFIG_FILES = [
    '.eslintrc.js',
    '.eslintrc.json',
    'eslint.config.mjs',
    'eslint.config.js',
  ];

  static readonly PATTERNS = {
    SECURITY_PLUGIN: /security|@typescript-eslint/,
    GITHUB_SECURITY_WORKFLOW: /security|codeql/i,
  };

  // Helper Methods

  static hasTool(dependencies: Record<string, string>): boolean {
    return Object.keys(this.TOOLS).some(tool => dependencies[tool]);
  }

  static detectTools(dependencies: Record<string, string>): string[] {
    return Object.entries(this.TOOLS)
      .filter(([dep]) => dependencies[dep])
      .map(([, name]) => name);
  }

  static isValidConfigFile(filename: string): boolean {
    return this.CONFIG_FILES.some(config => filename.endsWith(config));
  }

  static hasSecurityConfig(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.PATTERNS.SECURITY_PLUGIN
    );
  }

  static isSecurityWorkflow(workflowName: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      workflowName,
      this.PATTERNS.GITHUB_SECURITY_WORKFLOW
    );
  }
}
