import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { glob } from 'glob';
import { ConfigFileUtils } from '../../../utils/config-file-utils';
import { TEST_FILE_GLOBS } from '../../../utils/constants';
import { FileUtils } from '../../../utils/file-utils';
import { PathOperations } from '../../../utils/path-operations';

const TEST_COUNT_IGNORES = ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.nx/**', '**/.angular/**'];
/**
 * Build Validation Checker
 * Validates build scripts and compilation setup
 */
export class BuildValidationChecker {
  validate(context: LawCheckContext): {
    isValid: boolean;
    configured: boolean;
    buildScripts: string[];
    errors?: string[];
    warnings?: string[];
  } {
    const validation = this.checkBuildValidation(context.projectRoot, context);
    return {
      isValid: validation.configured,
      errors: validation.configured ? [] : ['Build validation failed'],
      warnings: [],
      ...validation,
    };
  }

  checkBuildValidation(
    projectRoot: string,
    _context: LawCheckContext
  ): {
    configured: boolean;
    buildScripts: string[];
  } {
    const buildScripts: string[] = [];

    // Check package.json for build scripts
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      const extractedScripts = this.extractBuildScripts(packageJsonPath);
      buildScripts.push(...extractedScripts);
    }

    // Check for TypeScript/Angular build files
    const buildConfigFiles = [
      'tsconfig.json',
      'angular.json',
      'webpack.config.js',
      'vite.config.js',
      'nx.json',
    ];

    let hasConfigFile = false;
    for (const configFile of buildConfigFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        hasConfigFile = true;
        break;
      }
    }

    return {
      configured: buildScripts.length > 0 && hasConfigFile,
      buildScripts,
    };
  }

  checkTestingSetup(
    projectRoot: string,
    _context?: LawCheckContext
  ): {
    configured: boolean;
    testScripts: string[];
    testFiles: number;
  } {
    const testScripts: string[] = [];
    let testFiles = 0;

    // Check package.json for test scripts
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      const extractedScripts = this.extractTestScripts(packageJsonPath);
      testScripts.push(...extractedScripts);
    }

    // Count test files
    try {
      testFiles = this.countTestFiles(
        projectRoot,
        _context?.config ?? ConfigFileUtils.getMinimalDefaultConfig()
      );
    } catch (_error) {
      // Ignore file system errors
      testFiles = 0;
    }

    return {
      configured: testScripts.length > 0,
      testScripts,
      testFiles,
    };
  }

  private extractBuildScripts(packageJsonPath: string): string[] {
    const buildScripts: string[] = [];

    try {
      const packageJson = JSON.parse(
        FileUtils.readFile(packageJsonPath, { encoding: 'utf8' })
      );

      if (packageJson.scripts) {
        const buildRelatedScripts = [
          'build',
          'build:prod',
          'build:production',
          'compile',
          'dist',
        ];

        for (const script of buildRelatedScripts) {
          if (packageJson.scripts[script]) {
            buildScripts.push(script);
          }
        }
      }
    } catch (_error) {
      // Ignore JSON parsing errors - return empty array
      return [];
    }

    return buildScripts;
  }

  /**
   * Test files, counted by their names. This used to ask a SOURCE scan — one
   * that hides tests by design — and then filter it for test names, so it
   * found only the spellings the hiding list happened to miss (`.spec.js`)
   * and reported 0 for every `.spec.ts`. Its tests asserted that 0 as a
   * "temp directory limitation". The project's own ignores still apply to
   * everything but the test-hiding patterns.
   */
  private countTestFiles(dir: string, _config: RuleOfCodeConfig): number {
    if (!FileUtils.exists(dir)) return 0;
    const found = new Set<string>();
    for (const pattern of TEST_FILE_GLOBS) {
      for (const file of glob.sync(pattern, {
        cwd: dir,
        absolute: true,
        nodir: true,
        ignore: TEST_COUNT_IGNORES,
      })) {
        found.add(file);
      }
    }
    return found.size;
  }

  private extractTestScripts(packageJsonPath: string): string[] {
    const testScripts: string[] = [];

    try {
      const packageJson = JSON.parse(
        FileUtils.readFile(packageJsonPath, { encoding: 'utf8' })
      );

      if (packageJson.scripts) {
        const testRelatedScripts = [
          'test',
          'test:unit',
          'test:integration',
          'test:e2e',
          'jest',
          'cypress',
          'karma',
        ];

        for (const script of testRelatedScripts) {
          if (packageJson.scripts[script]) {
            testScripts.push(script);
          }
        }
      }
    } catch (_error) {
      // Ignore JSON parsing errors
    }

    return testScripts;
  }
}

export const buildValidator = new BuildValidationChecker();
