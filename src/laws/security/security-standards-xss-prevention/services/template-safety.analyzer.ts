import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { TemplateSafetyConstants } from '../constants';

/**
 * TemplateSafetyAnalyzer
 *
 * Specialized analyzer for HTML template security.
 * Single Responsibility: Detect unsafe patterns in templates (innerHTML, inline scripts, etc.)
 */
export class TemplateSafetyAnalyzer {
  /**
   * Analyze HTML templates for unsafe patterns
   * Checks for innerHTML bindings, inline scripts, javascript: protocol, inline handlers
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    const templateFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().ANGULAR,
      config
    );

    for (const file of templateFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const relativePath = PathOperations.getRelative(projectRoot, file);

        const detectedPatterns =
          TemplateSafetyConstants.detectPatterns(content);

        for (const { message } of detectedPatterns) {
          violations.push(`${message} in ${relativePath}`);
        }
      } catch (_error) {
        // Continue with other files
      }
    }

    return violations;
  }
}
