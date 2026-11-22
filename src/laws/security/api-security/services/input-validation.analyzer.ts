import type * as TS from 'typescript';
import { AngularComponentFiles } from '../../../../utils/angular-component-files';
import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { loadTypeScript } from '../../../../utils/react/tsx-source';
import { InputValidationConstants } from '../constants';
import { readApiCodeView } from './api-code-view';

/**
 * InputValidationAnalyzer
 *
 * Specialized analyzer for input validation and sanitization.
 * Single Responsibility: Form validation and XSS prevention detection
 */
export class InputValidationAnalyzer {
  /**
   * `ts` is the parser the HTTP services are read with; without it they are
   * not judged (the coordinator says so once for the law).
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig,
    ts: typeof TS | null = loadTypeScript(projectRoot)
  ): string[] {
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

    if (ts) {
      for (const file of allFiles) {
        if (this.isUnvalidatedHttpService(ts, file)) {
          violations.push(
            `${PathOperations.getRelative(projectRoot, file)}: HTTP requests without proper validation`
          );
        }
      }
    }

    return violations;
  }

  /**
   * A service (`*.service.ts`, or an `@Injectable()` class — an Angular-20
   * suffix-less `user.ts`) that uses HttpClient and does not check what it
   * receives (#550). Read in code: a file that only lists '@Injectable()'
   * and 'HttpClient' in its strings is no service, and the word "validate"
   * in a comment checks nothing.
   */
  private static isUnvalidatedHttpService(
    ts: typeof TS,
    file: string
  ): boolean {
    let content: string;
    try {
      content = FileUtils.readFile(file, { encoding: 'utf8' });
    } catch (_error) {
      return false;
    }
    if (!content.includes('HttpClient')) return false;
    const view = readApiCodeView(ts, file, content);
    if (!view) return false;
    const isService =
      file.includes('.service.ts') ||
      InputValidationConstants.isInjectable(view);
    return (
      isService &&
      InputValidationConstants.usesHttpClient(view) &&
      !InputValidationConstants.validatesResponses(view)
    );
  }
}
