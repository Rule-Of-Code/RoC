import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { FileScannerBase } from './file-scanner-base';

/**
 * API Testing Framework Inspector
 * Specialized utility for analyzing API testing framework setup and configuration
 */
export class APITestingFrameworkInspector extends FileScannerBase {
  /**
   * Check for API testing framework configuration
   */
  static checkAPITestingFramework(projectRoot: string): {
    hasFramework: boolean;
    frameworks: string[];
    configFiles: string[];
  } {
    const frameworks: string[] = [];
    const configFiles: string[] = [];

    // Check package.json for API testing frameworks
    this.checkAPITestingDependencies(projectRoot, frameworks);

    // Check for framework configuration files
    this.findFrameworkConfigFiles(projectRoot, configFiles);

    return {
      hasFramework: frameworks.length > 0,
      frameworks,
      configFiles,
    };
  }

  /**
   * Check package.json for API testing dependencies
   */
  private static checkAPITestingDependencies(
    projectRoot: string,
    frameworks: string[]
  ): void {
    try {
      const allDependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      const apiTestingLibraries = [
        'supertest',
        'axios',
        'got',
        'node-fetch',
        'request',
        'cypress',
        '@playwright/test',
        'puppeteer',
        'jest',
        'mocha',
        'chai',
        'jasmine',
        'ava',
        'tap',
        'newman', // Postman CLI
        'dredd', // API Blueprint testing
      ];

      for (const lib of apiTestingLibraries) {
        if (allDependencies[lib]) {
          frameworks.push(lib);
        }
      }

      // Check for specialized API testing tools
      if (allDependencies['@nestjs/testing']) {
        frameworks.push('NestJS Testing');
      }
      if (allDependencies['express']) {
        frameworks.push('Express (potential API framework)');
      }
      if (allDependencies['fastify']) {
        frameworks.push('Fastify (potential API framework)');
      }
    } catch (_error) {
      // Ignore dependency detection errors
    }
  }

  /**
   * Find API testing framework configuration files
   */
  private static findFrameworkConfigFiles(
    projectRoot: string,
    configFiles: string[]
  ): void {
    const configPatterns = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json',
      'cypress.config.js',
      'cypress.config.ts',
      'playwright.config.js',
      'playwright.config.ts',
      'mocha.opts',
      '.mocharc.js',
      '.mocharc.json',
      'ava.config.js',
      'tap-parallel-not-ok',
      'newman.json',
      'dredd.yml',
      'dredd.yaml',
    ];

    this.searchConfigFilesRecursively(projectRoot, configPatterns, configFiles);
  }

  /**
   * Search for configuration files recursively
   */
  private static searchConfigFilesRecursively(
    directory: string,
    patterns: string[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      name => patterns.includes(name),
      results,
      nextDir => { this.searchConfigFilesRecursively(nextDir, patterns, results); }
    );
  }
}
