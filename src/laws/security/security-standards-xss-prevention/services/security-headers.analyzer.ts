import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { SecurityHeadersConstants } from '../constants';

/**
 * SecurityHeadersAnalyzer
 *
 * Specialized analyzer for security headers implementation.
 * Single Responsibility: Verify security headers presence (helmet, X-* headers)
 */
export class SecurityHeadersAnalyzer {
  /**
   * Analyze security headers implementation
   * Checks for helmet, X-* headers, and security configurations
   * Low cognitive complexity by delegating to helper methods
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    const hasSecurityHeaders =
      this.hasSecurityHeadersInServerFiles(projectRoot, config) ||
      this.hasSecurityHeadersInConfigFiles(projectRoot);

    if (!hasSecurityHeaders) {
      violations.push(
        'No security headers implementation found (helmet, custom headers, etc.)'
      );
    }

    return violations;
  }

  /**
   * Check if security headers exist in server/app files
   * Helper method extracted for complexity reduction
   */
  private static hasSecurityHeadersInServerFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): boolean {
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.js', '.html', '.scss', '.css'],
      config
    );

    const serverFiles = this.filterServerFiles(allFiles);

    for (const file of serverFiles) {
      if (this.fileContainsSecurityHeaders(file)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if security headers exist in config files
   * Helper method extracted for complexity reduction
   */
  private static hasSecurityHeadersInConfigFiles(projectRoot: string): boolean {
    for (const configFile of SecurityHeadersConstants.CONFIG_FILES) {
      const fullPath = PathOperations.join(projectRoot, configFile);

      if (!FileUtils.exists(fullPath)) {
        continue;
      }

      try {
        const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });

        if (content.includes('headers') || content.includes('helmet')) {
          return true;
        }
      } catch (_error) {
        // Continue checking other files
      }
    }

    return false;
  }

  /**
   * Filter files to get server/app entry files
   * Helper method for file filtering logic
   */
  private static filterServerFiles(files: string[]): string[] {
    return files.filter(filePath => {
      const filename = PathOperations.getBasename(filePath).toLowerCase();
      return this.isServerFile(filename);
    });
  }

  /**
   * Check if filename is server-related entry file
   * Helper method for single condition check
   */
  private static isServerFile(filename: string): boolean {
    return (
      filename.includes('server') ||
      filename.includes('app') ||
      filename.includes('main') ||
      filename.includes('index')
    );
  }

  /**
   * Check if file contains security header patterns
   * Helper method extracted for complexity reduction
   */
  private static fileContainsSecurityHeaders(filePath: string): boolean {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });

      for (const pattern of SecurityHeadersConstants.HEADER_PATTERNS) {
        if (content.includes(pattern)) {
          return true;
        }
      }
    } catch (_error) {
      // Continue with other files
    }

    return false;
  }
}
