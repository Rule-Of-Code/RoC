/**
 * Project Structure Standards Law
 * Ensures proper project organization
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';

// Core utilities
import { CheckerUtils } from '../../utils/checker-utils';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { LawBase } from '../law-base';

export class ProjectStructureStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check package.json structure
    const packageAnalysis = this.analyzePackageJson(context.projectRoot);
    violations.push(...packageAnalysis.violations);
    suggestions.push(...packageAnalysis.suggestions);

    // Check for proper project structure
    const structureAnalysis = this.analyzeProjectStructure(
      context.projectRoot,
      context.config
    );
    violations.push(...structureAnalysis.violations);
    suggestions.push(...structureAnalysis.suggestions);

    // Check configuration files
    const configAnalysis = this.analyzeConfigurationFiles(context.projectRoot);
    suggestions.push(...configAnalysis.suggestions);

    // Initialize configurable threshold
    const perViolationDeduction =
      context.config.thresholds?.documentation?.projectStructure
        ?.perViolationDeduction ?? 12;

    return LawBase.buildDetailedResult({
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Project structure standards met'
          : `${violations.length} project structure violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * perViolationDeduction),
      context,
    });
  }

  /**
   * No package.json — resolve the manifest the project's own stack uses.
   *
   * Until v7.13.0 a missing package.json was pushed as a violation outright, so
   * every Python, Rust or Go project failed this UNIVERSAL law forever and the
   * only way to pass was to drop a Node manifest into a repo with no business
   * owning one. Python is now resolved properly; Rust and Go still have no path.
   */
  private static checkNonNodeManifest(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    if (PythonSatisfaction.projectManifest(projectRoot)) {
      return { violations: [], suggestions: [] };
    }
    if (PythonSatisfaction.isPython(projectRoot)) {
      return {
        violations: ['Missing pyproject.toml'],
        suggestions: [
          'Declare packaging metadata in pyproject.toml (PEP 621 [project] table)',
        ],
      };
    }
    return {
      violations: ['Missing package.json'],
      suggestions: ['Initialize npm project with package.json'],
    };
  }

  private static analyzePackageJson(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const packagePath = PathOperations.join(projectRoot, 'package.json');

    if (!FileUtils.exists(packagePath)) {
      return this.checkNonNodeManifest(projectRoot);
    }

    try {
      const packageJson = FileSystemOperations.readJsonFile(
        packagePath,
        {}
      ) as Record<string, unknown>;

      // Essential fields
      const essentialFields = ['name', 'version', 'description'];
      for (const field of essentialFields) {
        if (!packageJson[field]) {
          violations.push(`Missing ${field} in package.json`);
          suggestions.push(`Add ${field} field to package.json`);
        }
      }

      // Scripts section
      if (!packageJson.scripts) {
        violations.push('Missing scripts section in package.json');
        suggestions.push('Add build, test, and lint scripts to package.json');
      } else {
        const scripts = packageJson.scripts as Record<string, unknown>;
        const recommendedScripts = ['build', 'test', 'lint'];
        for (const script of recommendedScripts) {
          if (!scripts[script]) {
            suggestions.push(
              `Consider adding '${script}' script to package.json`
            );
          }
        }
      }
    } catch (_error) {
      violations.push('Invalid package.json format');
      suggestions.push('Fix package.json JSON syntax errors');
    }

    return { violations, suggestions };
  }

  private static analyzeProjectStructure(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for source directory
    const srcPatterns = ['src', 'lib', 'app'];
    const hasSrcDir = srcPatterns.some(pattern =>
      FileUtils.exists(PathOperations.join(projectRoot, pattern))
    );

    if (!hasSrcDir) {
      suggestions.push('Consider organizing code in src/ or lib/ directory');
    }

    // Check for tests directory or test files
    const testPatterns = ['test', 'tests', '__tests__', 'spec'];
    const hasTestDir = testPatterns.some(pattern =>
      FileUtils.exists(PathOperations.join(projectRoot, pattern))
    );

    if (!hasTestDir) {
      // Check for test files
      const files = CheckerUtils.findFilesByExtension(
        projectRoot,
        ['ts', 'js', 'tsx', 'jsx'],
        config
      );
      const hasTestFiles = files.some(
        (file: string) => file.includes('.test.') || file.includes('.spec.')
      );

      if (!hasTestFiles) {
        suggestions.push('Create test directory or add test files');
      }
    }

    return { violations, suggestions };
  }

  private static analyzeConfigurationFiles(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for common config files
    const configFiles = [
      { file: 'tsconfig.json', purpose: 'TypeScript configuration' },
      { file: '.eslintrc.js', purpose: 'ESLint configuration' },
      { file: '.prettierrc', purpose: 'Code formatting configuration' },
      { file: 'jest.config.js', purpose: 'Testing framework configuration' },
    ];

    for (const configFile of configFiles) {
      if (
        !FileUtils.exists(PathOperations.join(projectRoot, configFile.file))
      ) {
        suggestions.push(
          `Consider adding ${configFile.file}: ${configFile.purpose}`
        );
      }
    }

    return { violations, suggestions };
  }
}
