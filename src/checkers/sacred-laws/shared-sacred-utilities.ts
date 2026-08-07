import type { RuleOfCodeConfig } from '../../config/types';
import type { LawResult } from '../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { BaseCheckerUtilities } from '../shared/base-checker-utilities';

/**
 * Shared Sacred Law Utilities
 * Common patterns and operations for sacred law checkers
 */
export class SacredLawUtilities extends BaseCheckerUtilities {
  /**
   * Standard sacred law validation initialization
   */
  static initializeSacredValidation(): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
  } {
    return {
      violations: [],
      suggestions: [],
      passed: true,
    };
  }

  /**
   * Standard quality assurance pattern
   */
  static createQualityAssuranceCheck(
    checkName: string,
    qualityValidator: (
      projectRoot: string,
      config: RuleOfCodeConfig
    ) => boolean,
    violationMessage: string,
    suggestionMessage: string
  ) {
    return (
      projectRoot: string,
      config: RuleOfCodeConfig
    ): {
      violations: string[];
      suggestions: string[];
      passed: boolean;
    } => {
      const { violations, suggestions } = this.initializeSacredValidation();
      let passed = true;

      try {
        if (!qualityValidator(projectRoot, config)) {
          violations.push(violationMessage);
          suggestions.push(suggestionMessage);
          passed = false;
        }
      } catch (error) {
        this.handleCheckError(
          checkName,
          error,
          violations,
          suggestions,
          `Ensure ${checkName} quality standards are properly configured`
        );
        passed = false;
      }

      return { violations, suggestions, passed };
    };
  }

  /**
   * Creates a sacred law result using base functionality
   */
  static createSacredLawResult(
    violations: string[],
    suggestions: string[],
    successMessage: string,
    failureMessageSuffix: string,
    score = 100
  ): LawResult {
    return this.createStandardLawResult({
      violations,
      suggestions,
      successMessage,
      failureMessageSuffix,
      baseScore: score,
      scoreDeduction: 10,
    });
  }

  /**
   * Common package.json script checking pattern
   */
  static checkPackageScripts(
    projectRoot: string,
    scriptChecker: (
      scripts: Record<string, string>,
      violations: string[],
      suggestions: string[]
    ) => void
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = ProjectTypeDetectorValidation.getPackageJson(
          projectRoot
        ) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const scripts = packageJson.scripts ?? {};

        scriptChecker(scripts, violations, suggestions);
      } catch (error) {
        this.handleCheckError(
          'Package.json script check',
          error,
          violations,
          suggestions
        );
      }
    } else {
      violations.push('No package.json found');
      suggestions.push('Initialize package.json for project configuration');
    }

    return { violations, suggestions };
  }
  static checkProfessionalStandards(
    projectRoot: string,
    standards: Array<{
      name: string;
      validator: (projectRoot: string) => boolean;
      violationMessage: string;
      suggestionMessage: string;
    }>
  ): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
  } {
    const { violations, suggestions } = this.initializeSacredValidation();
    let passed = true;

    for (const standard of standards) {
      try {
        if (!standard.validator(projectRoot)) {
          violations.push(standard.violationMessage);
          suggestions.push(standard.suggestionMessage);
          passed = false;
        }
      } catch (error) {
        violations.push(
          `${standard.name} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        suggestions.push(`Review ${standard.name} configuration`);
        passed = false;
      }
    }

    return { violations, suggestions, passed };
  }

  /**
   * Common compliance monitoring pattern
   */
  static executeComplianceMonitoring(
    projectRoot: string,
    complianceChecks: Array<{
      name: string;
      check: (projectRoot: string) => {
        passed: boolean;
        message?: string;
        suggestion?: string;
      };
    }>
  ): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
  } {
    const { violations, suggestions } = this.initializeSacredValidation();
    let passed = true;

    for (const compliance of complianceChecks) {
      try {
        const result = compliance.check(projectRoot);
        if (!result.passed) {
          violations.push(
            result.message ?? `${compliance.name} compliance failed`
          );
          suggestions.push(
            result.suggestion ?? `Fix ${compliance.name} compliance issues`
          );
          passed = false;
        }
      } catch (error) {
        violations.push(
          `${compliance.name} monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        suggestions.push(`Check ${compliance.name} monitoring configuration`);
        passed = false;
      }
    }

    return { violations, suggestions, passed };
  }
}
