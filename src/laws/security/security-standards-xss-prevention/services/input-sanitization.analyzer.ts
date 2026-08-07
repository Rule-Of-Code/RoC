import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { SanitizationConstants } from '../constants';

/**
 * InputSanitizationAnalyzer
 *
 * Specialized analyzer for input sanitization practices.
 * Single Responsibility: Verify DomSanitizer usage and sanitization calls
 */
export class InputSanitizationAnalyzer {
  /**
   * Analyze input sanitization implementation
   * Checks for DomSanitizer usage and proper sanitization calls
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );

    let hasDomSanitizer = false;
    let hasProperSanitization = false;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const relativePath = PathOperations.getRelative(projectRoot, file);

        // Check for DomSanitizer
        if (SanitizationConstants.hasDomSanitizer(content)) {
          hasDomSanitizer = true;

          if (SanitizationConstants.hasSanitizationCall(content)) {
            hasProperSanitization = true;
          }
        }

        // Check for unsanitized user input
        if (SanitizationConstants.hasUnsanitizedInput(content)) {
          violations.push(
            `Potential unsanitized user input handling in ${relativePath}`
          );
        }
      } catch (_error) {
        // Continue with other files
      }
    }

    if (!hasDomSanitizer) {
      violations.push(
        'No DomSanitizer implementation found - required for safe HTML handling'
      );
    }

    if (hasDomSanitizer && !hasProperSanitization) {
      violations.push('DomSanitizer imported but no sanitization calls found');
    }

    return violations;
  }
}
