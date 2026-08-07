import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Unit Test Automation Standards Constants
 *
 * Centralized test automation patterns and helper methods
 * for identifying proper CI/CD and automation practices in projects.
 *
 * Patterns cover:
 * - Test script configuration
 * - Test runner setup
 * - CI/CD configuration
 * - Automated test execution
 * - Test environment setup
 * - Parallelization support
 */
export class UnitTestAutomationStandardsConstants {
  // ============================================
  // 1. Test Script Patterns
  // ============================================

  static readonly TEST_SCRIPT_PATTERNS = [
    'test',
    'test:unit',
    'test:watch',
    'test:e2e',
    'test:ci',
  ];

  // ============================================
  // 2. Test Runner Patterns
  // ============================================

  static readonly TEST_RUNNER_CONFIG_PATTERNS = {
    JEST_CONFIG: /jest\.config|jest\.preset|jest/,
    MOCHA_CONFIG: /mocha|\.mocharc/,
    VITEST_CONFIG: /vitest\.config|vitest/,
    KARMA_CONFIG: /karma\.config/,
    PLAYWRIGHT_CONFIG: /playwright\.config/,
    CYPRESS_CONFIG: /cypress\.config/,
  };

  static readonly TEST_RUNNER_DEPENDENCIES = [
    'jest',
    'mocha',
    'vitest',
    'karma',
    'playwright',
    'cypress',
  ];

  // ============================================
  // 3. CI/CD Configuration Patterns
  // ============================================

  static readonly CICD_CONFIG_FILES = [
    '.github/workflows',
    '.gitlab-ci.yml',
    'bitbucket-pipelines.yml',
    'azure-pipelines.yml',
    'Jenkinsfile',
    '.circleci/config.yml',
    '.travis.yml',
  ];

  static readonly CICD_PATTERNS = {
    GITHUB_ACTIONS: /\.github\/workflows/,
    GITLAB_CI: /\.gitlab-ci\.yml/,
    BITBUCKET_PIPELINES: /bitbucket-pipelines\.yml/,
    AZURE_PIPELINES: /azure-pipelines\.yml/,
    JENKINS: /Jenkinsfile/,
    CIRCLECI: /\.circleci\/config\.yml/,
  };

  // ============================================
  // 4. Automated Test Execution Patterns
  // ============================================

  static readonly AUTOMATED_TEST_PATTERNS = {
    NPM_TEST: /npm\s+test|npm\s+run\s+test/,
    YARN_TEST: /yarn\s+test/,
    PNPM_TEST: /pnpm\s+test/,
    TEST_COMMAND: /test:/,
    JEST_COMMAND: /jest/,
    MOCHA_COMMAND: /mocha/,
    VITEST_COMMAND: /vitest/,
  };

  // ============================================
  // 5. Test Environment Patterns
  // ============================================

  static readonly TEST_ENVIRONMENT_PATTERNS = {
    JEST_SETUP: /jest\.setup|setupFilesAfterEnv/,
    TEST_SETUP: /test\.setup|test-setup/,
    ENV_TEST: /\.env\.test|env-test/,
    TEST_UTILS: /test[-_]utils|test-utilities/,
    FIXTURES: /fixtures|__mocks__|mocks/,
  };

  // ============================================
  // 6. Parallelization Patterns
  // ============================================

  static readonly PARALLELIZATION_PATTERNS = {
    PARALLEL_FLAG: /--parallel|--maxWorkers/,
    JEST_MAX_WORKERS: /maxWorkers/,
    CI_WORKERS: /--workers|--jobs/,
  };

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if package.json has test scripts
   */
  static hasTestScripts(packageJson: Record<string, unknown>): boolean {
    const scripts = packageJson.scripts as Record<string, string> | undefined;
    if (!scripts) return false;
    return this.TEST_SCRIPT_PATTERNS.some(script => script in scripts);
  }

  /**
   * Check if test runner is configured
   */
  static hasTestRunner(projectRoot: string, hasConfigFile: boolean): boolean {
    const dependencies =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    const hasDependency = this.TEST_RUNNER_DEPENDENCIES.some(
      dep => dep in dependencies
    );

    return hasDependency || hasConfigFile;
  }

  /**
   * Check if content has CI/CD configuration
   */
  static hasCICDConfig(content: string): boolean {
    return Object.values(this.CICD_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has automated test execution
   */
  static hasAutomatedTests(content: string): boolean {
    return Object.values(this.AUTOMATED_TEST_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has test environment setup
   */
  static hasTestEnvironment(content: string): boolean {
    return Object.values(this.TEST_ENVIRONMENT_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if test scripts include parallelization
   */
  static hasParallelization(content: string): boolean {
    return Object.values(this.PARALLELIZATION_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Get automation readiness level
   */
  static getAutomationLevel(
    hasScripts: boolean,
    hasRunner: boolean,
    hasCICD: boolean,
    hasEnv: boolean
  ): string {
    let score = 0;
    if (hasScripts) score += 25;
    if (hasRunner) score += 25;
    if (hasCICD) score += 25;
    if (hasEnv) score += 25;

    return score >= 100 ? 'EXCELLENT' : 'CRITICAL';
  }

  /**
   * Get score deduction for automation level
   */
  static getScoreDeduction(level: string): number {
    const deductions: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 10,
      ACCEPTABLE: 25,
      POOR: 50,
      CRITICAL: 75,
    };

    return deductions[level] ?? 0;
  }
}
