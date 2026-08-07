import { FileUtils, PathOperations } from '../../../../utils';
import { CSPConstants } from '../constants';


/**
 * CSPConfigurationAnalyzer
 *
 * Specialized analyzer for Content Security Policy validation.
 * Single Responsibility: CSP configuration presence and directive validation
 */
export class CSPConfigurationAnalyzer {
  /**
   * Analyze Content Security Policy configuration
   * Checks for CSP presence and validates required directives
   */
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    let foundCSPConfig = false;

    for (const configPath of CSPConstants.CONFIG_FILES) {
      const fullPath = PathOperations.join(projectRoot, configPath);

      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });

          if (CSPConstants.hasConfiguration(content)) {
            foundCSPConfig = true;
            this.validateDirectives(content, fullPath, violations);
            break;
          }
        } catch (_error) {
          // Continue checking other files
        }
      }
    }

    if (!foundCSPConfig) {
      violations.push('No Content Security Policy configuration found');
    }

    return violations;
  }

  /**
   * Validate CSP directives and practices
   * Checks for required directives and unsafe practices
   */
  private static validateDirectives(
    content: string,
    configPath: string,
    violations: string[]
  ): void {
    const filename = PathOperations.getBasename(configPath);

    // Check for required directives
    for (const directive of CSPConstants.REQUIRED_DIRECTIVES) {
      if (CSPConstants.hasMissingDirective(content, directive)) {
        violations.push(`Missing CSP directive: ${directive} in ${filename}`);
      }
    }

    // Check for unsafe practices
    if (CSPConstants.hasUnsafePractice(content)) {
      violations.push(
        `Unsafe CSP practices ('unsafe-inline'/'unsafe-eval') in ${filename}`
      );
    }
  }
}
