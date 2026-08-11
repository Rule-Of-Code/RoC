/**
 * Automation First Principle Law
 * Automated processes over manual interventions
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { hasCiConfig } from '../../utils/project-discovery';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { PackageJsonUtilities } from './package-json-utilities';
import { SacredLawUtilities } from './shared-sacred-utilities';

export class AutomationFirstLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for automated CI/CD
    const cicdAnalysis = this.checkCICDAutomation(context.projectRoot, context.config);
    violations.push(...cicdAnalysis.violations);
    suggestions.push(...cicdAnalysis.suggestions);

    // Check for automated testing
    const testAutomation = this.checkTestAutomation(context.projectRoot);
    violations.push(...testAutomation.violations);
    suggestions.push(...testAutomation.suggestions);

    // Check for automated quality checks
    const qualityAutomation = this.checkQualityAutomation(context.projectRoot);
    violations.push(...qualityAutomation.violations);
    suggestions.push(...qualityAutomation.suggestions);

    return SacredLawUtilities.createSacredLawResult(
      violations,
      suggestions,
      'Automation first principles followed',
      'automation gaps found'
    );
  }

  private static checkCICDAutomation(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Shared discovery: this list was one of six private copies, and every one
    // of them was missing a different provider.
    const hasCICD = hasCiConfig(projectRoot, config);

    if (!hasCICD) {
      violations.push(
        'No CI/CD automation detected. Declare pathMappings.cicdConfig if your CI config lives at a non-standard path.'
      );
      suggestions.push(
        'Set up automated CI/CD pipeline (GitHub Actions, GitLab CI, etc.)'
      );
    }

    return { violations, suggestions };
  }

  private static checkTestAutomation(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    // The whole probe below reads package.json: its `test` scripts and its jest/
    // mocha/cypress dependencies. A Python project that configures pytest (or
    // unittest/nox/tox) HAS automated tests — the concern is satisfied natively,
    // and package.json is not its substrate. Asked only for Python projects, so
    // JS/TS detection is untouched.
    if (this.hasPythonTestAutomation(projectRoot)) {
      return { violations: [], suggestions: [] };
    }

    return SacredLawUtilities.checkPackageScripts(
      projectRoot,
      (scripts, violations, suggestions) => {
        if (!scripts.test && !scripts['test:unit'] && !scripts['test:e2e']) {
          violations.push('No automated test scripts');
          suggestions.push('Add automated test scripts to package.json');
        }

        if (!scripts['test:watch']) {
          suggestions.push(
            'Add test:watch script for continuous testing during development'
          );
        }

        // Check for test frameworks
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        const testFrameworks = [
          'jest',
          'mocha',
          'jasmine',
          'cypress',
          'playwright',
        ];
        const hasTestFramework = testFrameworks.some(
          framework => deps[framework]
        );

        if (!hasTestFramework) {
          violations.push('No test framework detected');
          suggestions.push(
            'Install and configure automated testing framework (Jest, Cypress, etc.)'
          );
        }
      }
    );
  }

  /** Automated tests, the Python way — pytest/unittest/nox/tox instead of jest. */
  private static hasPythonTestAutomation(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasTestFramework(projectRoot)
    );
  }

  /**
   * Every quality probe below reads package.json scripts. On a Python project
   * that has none (uv/hatchling), "Missing package.json" demands a foreign
   * ecosystem's manifest — the substrate is absent, which is N/A, not a
   * violation. A Python project that DOES ship a package.json is still held to
   * the scripts it declares.
   */
  private static lacksPackageJsonSubstrate(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      !FileUtils.exists(PathOperations.join(projectRoot, 'package.json'))
    );
  }

  private static checkQualityAutomation(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    if (this.lacksPackageJsonSubstrate(projectRoot)) {
      return { violations: [], suggestions: [] };
    }

    return PackageJsonUtilities.performQualityCheck(
      projectRoot,
      packageJson => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const scripts = packageJson.scripts ?? {};

        // Check for automated linting
        if (!scripts.lint && !scripts['lint:check']) {
          violations.push('No automated linting scripts');
          suggestions.push('Add lint script for automated code quality checks');
        }

        // Check for automated formatting (advisory)
        if (!scripts.format && !scripts['format:check']) {
          suggestions.push('Add format script for automated code formatting');
        }

        // Check for pre-commit automation (advisory)
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        if (!deps.husky && !deps['pre-commit'] && !deps['lint-staged']) {
          suggestions.push('Set up pre-commit hooks for automated quality gates');
        }

        // Check for automated builds — a VIOLATION, and independent of the
        // format check above. It used to be nested inside `if (!format)`, so a
        // project that had a format script was never checked for a build script
        // and the violation silently vanished.
        if (!scripts.build) {
          violations.push('No automated build script');
          suggestions.push(
            'Add build script for automated compilation/bundling'
          );
        }

        return { violations, suggestions };
      }
    );
  }
}
