import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { CodeText } from '../../../../utils/code-text';
import { DangerousPatternsConstants } from '../constants';

/**
 * DangerousPatternsAnalyzer
 *
 * Specialized analyzer for dangerous Angular and JavaScript patterns.
 * Single Responsibility: Detect innerHTML, bypassSecurityTrust*, eval, document.write
 */
export class DangerousPatternsAnalyzer {
  /**
   * Analyze dangerous Angular patterns in code
   * Detects innerHTML, bypassSecurityTrust*, eval, document.write
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );

    for (const file of codeFiles) {
      try {
        // Strip comments: a dangerous pattern named in a `// note` is not a
        // dangerous call (FE finding). Strings are kept — an inline template is
        // real code.
        const content = CodeText.stripComments(
          FileUtils.readFile(file, { encoding: 'utf8' })
        );
        const relativePath = PathOperations.getRelative(projectRoot, file);

        const detectedPatterns =
          DangerousPatternsConstants.detectPatterns(content);

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
