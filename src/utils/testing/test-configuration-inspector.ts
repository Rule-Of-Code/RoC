import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../file-system-operations';
import { FileUtils } from '../file-utils';
import { NxWorkspace } from '../nx-workspace';
import { PathOperations } from '../path-operations';
/**
 * Test Configuration Inspector
 * Specialized utility for analyzing test configuration setup
 */
export class TestConfigurationInspector {
  /**
   * Check test configuration in project
   */
  static checkTestConfiguration(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for Jest configuration
    const jestConfig = this.checkJestConfiguration(projectRoot);
    if (!jestConfig.hasConfig) {
      violations.push('No Jest configuration found');
      suggestions.push('Add jest.config.js or package.json jest configuration');
    }

    // Check for test scripts in package.json
    const testScripts = this.checkTestScripts(projectRoot);
    if (!testScripts.hasTestScript) {
      violations.push('No test script found in package.json');
      suggestions.push('Add "test" script to package.json');
    }

    // Check for testing framework dependencies
    const testingFramework =
      this.checkTestingFrameworkDependencies(projectRoot);
    if (testingFramework.frameworks.length === 0) {
      violations.push('No testing framework dependencies found');
      suggestions.push(
        'Install testing framework (Jest, Mocha, Jasmine, etc.)'
      );
    }

    return { violations, suggestions };
  }

  /**
   * Check Jest configuration
   */
  private static checkJestConfiguration(projectRoot: string): {
    hasConfig: boolean;
    configFiles: string[];
  } {
    const configFiles: string[] = [];
    const jestConfigFiles = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json',
      'jest.config.mjs',
      'jest.config.cjs',
      'jest.preset.js', // Nx's shared preset
    ];

    // Resolve each name across the workspace — root AND apps/<name>/ — so an Nx
    // app whose jest.config.ts lives under apps/<name>/ is recognised instead of
    // reported as having "No Jest configuration found".
    for (const configFile of jestConfigFiles) {
      if (NxWorkspace.resolveSourceFiles(projectRoot, configFile).length > 0) {
        configFiles.push(configFile);
      }
    }

    // Check package.json for Jest config
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson =
          FileSystemOperations.readJsonFile<Record<string, unknown>>(
            packageJsonPath
          );
        if (packageJson.jest) {
          configFiles.push('package.json (jest config)');
        }
      } catch (_error) {
        // Ignore parsing errors
      }
    }

    return {
      hasConfig: configFiles.length > 0,
      configFiles,
    };
  }

  /**
   * Check test scripts in package.json
   */
  private static checkTestScripts(projectRoot: string): {
    hasTestScript: boolean;
    scripts: string[];
  } {
    const scripts: string[] = [];
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson =
          FileSystemOperations.readJsonFile<Record<string, unknown>>(
            packageJsonPath
          );

        const extractedScripts = this.extractTestScripts(packageJson);
        scripts.push(...extractedScripts);
      } catch (_error) {
        // Ignore parsing errors
      }
    }

    return {
      hasTestScript: scripts.length > 0,
      scripts,
    };
  }

  /**
   * Check testing framework dependencies
   */
  private static checkTestingFrameworkDependencies(projectRoot: string): {
    frameworks: string[];
    devDependencies: string[];
  } {
    const frameworks: string[] = [];
    const devDependencies: string[] = [];

    try {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const packageJson = ProjectTypeDetectorValidation.getPackageJson(
        projectRoot
      ) as Record<string, unknown>;

      const { extractedFrameworks, extractedDevDeps } =
        this.extractTestingLibraries(packageJson, allDeps);
      frameworks.push(...extractedFrameworks);
      devDependencies.push(...extractedDevDeps);
    } catch (_error) {
      // Ignore parsing errors
    }

    return { frameworks, devDependencies };
  }

  /**
   * Extract test-related scripts from package.json
   */
  private static extractTestScripts(
    packageJson: Record<string, unknown>
  ): string[] {
    const scripts: string[] = [];

    if (packageJson.scripts && typeof packageJson.scripts === 'object') {
      const packageScripts = packageJson.scripts as Record<string, string>;
      const testRelatedScripts = [
        'test',
        'test:unit',
        'test:watch',
        'test:coverage',
      ];

      for (const script of testRelatedScripts) {
        if (packageScripts[script]) {
          scripts.push(`${script}: ${packageScripts[script]}`);
        }
      }
    }

    return scripts;
  }

  /**
   * Extract testing libraries from dependencies
   */
  private static extractTestingLibraries(
    packageJson: Record<string, unknown>,
    allDeps: Record<string, string>
  ): {
    extractedFrameworks: string[];
    extractedDevDeps: string[];
  } {
    const extractedFrameworks: string[] = [];
    const extractedDevDeps: string[] = [];

    const testingLibraries = [
      'jest',
      'cypress',
      'playwright',
      '@playwright/test',
      'puppeteer',
      'selenium-webdriver',
      'webdriverio',
      'karma',
      'protractor',
      'mocha',
      'jasmine',
      'ava',
      'tape',
      'tap',
      'vitest',
      '@jest/core',
      '@testing-library/jest-dom',
      '@testing-library/react',
      '@testing-library/angular',
      '@testing-library/vue',
    ];

    for (const lib of testingLibraries) {
      if (allDeps[lib]) {
        extractedFrameworks.push(lib);
        const devDeps = packageJson.devDependencies as
          | Record<string, string>
          | undefined;
        if (devDeps?.[lib]) {
          extractedDevDeps.push(lib);
        }
      }
    }

    return { extractedFrameworks, extractedDevDeps };
  }
}
