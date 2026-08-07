import { AngularComponentFiles } from '../../../../utils/angular-component-files';
import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { InputValidationConstants } from '../constants';

/**
 * InputValidationAnalyzer
 *
 * Specialized analyzer for input validation and sanitization.
 * Single Responsibility: Form validation and XSS prevention detection
 */
export class InputValidationAnalyzer {
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    // Search for component files
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.tsx'],
      config
    );

    const componentFiles = allFiles.filter(f =>
      AngularComponentFiles.isComponentFile(f)
    );
    // By @Injectable, not just the *.service.ts suffix — an Angular-20 suffix-less
    // service (user.ts) is still checked for HTTP input validation.
    const serviceFiles = allFiles.filter(f => {
      if (f.includes('.service.ts')) {
        return true;
      }
      try {
        return /@Injectable\s*\(/.test(
          FileUtils.readFile(f, { encoding: 'utf8' })
        );
      } catch (_error) {
        return false;
      }
    });

    // Check component files for form validation
    for (const file of componentFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const relativePath = PathOperations.getRelative(projectRoot, file);

        // Only check for validators if FormControl is used
        const hasFormControl = InputValidationConstants.hasFormControl(content);
        const hasValidators = InputValidationConstants.hasValidators(content);

        if (hasFormControl && !hasValidators) {
          violations.push(
            `${relativePath}: FormControl without proper validators`
          );
        }

        if (InputValidationConstants.hasXSSVulnerability(content)) {
          violations.push(
            `${relativePath}: Potential XSS vulnerability with innerHTML`
          );
        }
      } catch (_error) {
        // Continue
      }
    }

    // Check service files for HTTP validation
    for (const file of serviceFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const relativePath = PathOperations.getRelative(projectRoot, file);

        if (
          content.includes('HttpClient') &&
          !InputValidationConstants.hasHttpValidation(content)
        ) {
          violations.push(
            `${relativePath}: HTTP requests without proper validation`
          );
        }
      } catch (_error) {
        // Continue
      }
    }

    return violations;
  }
}
