/**
 * DependencyScanningConstants
 *
 * Configuration for dependency vulnerability scanning.
 * Includes scanning scripts, tools, and configuration files.
 */
export class DependencyScanningConstants {
  static readonly SCRIPTS = ['security', 'audit', 'vulnerabilities'];

  static readonly TOOLS = ['snyk', '@snyk/cli', 'audit-ci', 'better-npm-audit'];

  static readonly CONFIG_FILES = [
    '.github/dependabot.yml',
    '.github/workflows/security.yml',
    '.github/workflows/dependency-check.yml',
    '.github/workflows/codeql-analysis.yml',
  ];

  // Helper Methods

  static hasSecurityScript(scripts: Record<string, string>): boolean {
    return Object.keys(scripts).some(script =>
      this.SCRIPTS.some(keyword => script.includes(keyword))
    );
  }

  static hasTool(dependencies: Record<string, string>): boolean {
    return this.TOOLS.some(tool => dependencies[tool]);
  }

  static isConfigFile(filename: string): boolean {
    return this.CONFIG_FILES.some(config =>
      filename.includes(config.split('/').pop() ?? '')
    );
  }
}
