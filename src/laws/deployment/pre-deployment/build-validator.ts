import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { CheckerUtils } from '../../../utils/checker-utils';
import { ConfigFileUtils } from '../../../utils/config-file-utils';
import { FileUtils } from '../../../utils/file-utils';
import { PathOperations } from '../../../utils/path-operations';
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

  private countTestFiles(dir: string, config: RuleOfCodeConfig): number {
    if (!FileUtils.exists(dir)) return 0;

    const testFileExtensions = ['.spec.ts', '.test.ts', '.spec.js', '.test.js'];

    // Try to use CheckerUtils for comprehensive file search
    try {
      const allFiles = CheckerUtils.findAllCodeFiles(dir, config);
      const testFiles = allFiles.filter(file =>
        testFileExtensions.some(ext => file.endsWith(ext))
      );

      // If CheckerUtils returns results, use them
      if (testFiles.length > 0) {
        return testFiles.length;
      }
    } catch (_error) {
      // Fall through to manual counting
    }

    // Fallback: manually count test files in common directories
    // This handles cases where CheckerUtils might fail or miss files
    let count = 0;
    const commonTestDirs = [
      'apps',
      'libs',
      'src',
      'test',
      'tests',
      '__tests__',
    ];

    for (const testDir of commonTestDirs) {
      const fullPath = PathOperations.join(dir, testDir);
      if (FileUtils.exists(fullPath)) {
        try {
          const files = CheckerUtils.findFilesByExtension(
            fullPath,
            testFileExtensions,
            config
          );
          count += files.length;
        } catch (_error) {
          // Continue with other directories
        }
      }
    }

    return count;
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
