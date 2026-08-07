import { CheckerUtils } from '../../../../utils/checker-utils';
import { ConfigFileUtils } from '../../../../utils/config-file-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { UnitTestAutomationStandardsConstants } from '../constants/automation';

/**
 * Unit Test Automation Standards Analyzer Service
 *
 * Orchestrates comprehensive test automation analysis across the project.
 * Checks for test scripts, runners, CI/CD integration, and automation setup.
 */
export class UnitTestAutomationStandardsAnalyzerService {
  /**
   * Analyze test automation setup
   */
  static analyzeTestAutomation(projectRoot: string): {
    hasTestScripts: boolean;
    hasTestRunner: boolean;
    hasTestEnvironment: boolean;
    hasParallelization: boolean;
  } {
    let hasTestScripts = false;
    let hasTestRunner = false;
    let hasTestEnvironment = false;
    let hasParallelization = false;

    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (FileUtils.exists(packageJsonPath)) {
      try {
        const content = FileUtils.readFile(packageJsonPath, {
          encoding: 'utf8',
        });
        const packageJson = JSON.parse(content) as Record<string, unknown>;

        // Check for test scripts
        hasTestScripts =
          UnitTestAutomationStandardsConstants.hasTestScripts(packageJson);

        // Check for test runner
        const hasConfigFile = this.hasTestRunnerConfig(projectRoot);
        hasTestRunner = UnitTestAutomationStandardsConstants.hasTestRunner(
          projectRoot,
          hasConfigFile
        );

        // Check for parallelization in test scripts
        const scripts = packageJson.scripts as
          | Record<string, string>
          | undefined;
        const testScript = scripts?.test ?? scripts?.['test:unit'] ?? '';
        hasParallelization =
          UnitTestAutomationStandardsConstants.hasParallelization(testScript);
      } catch (_error) {
        // Handle parsing errors
      }
    }

    // Check for test environment files
    hasTestEnvironment = this.hasTestEnvironmentSetup(projectRoot);

    return {
      hasTestScripts,
      hasTestRunner,
      hasTestEnvironment,
      hasParallelization,
    };
  }

  /**
   * Analyze CI/CD integration
   */
  static analyzeCICDIntegration(projectRoot: string): {
    hasCICDConfig: boolean;
    hasAutomatedTests: boolean;
  } {
    let hasCICDConfig = false;
    let hasAutomatedTests = false;

    for (const configFile of UnitTestAutomationStandardsConstants.CICD_CONFIG_FILES) {
      const filePath = PathOperations.join(projectRoot, configFile);

      if (FileUtils.exists(filePath)) {
        hasCICDConfig = true;

        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });

          if (UnitTestAutomationStandardsConstants.hasAutomatedTests(content)) {
            hasAutomatedTests = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return {
      hasCICDConfig,
      hasAutomatedTests,
    };
  }

  /**
   * Analyze test runner configuration
   */
  static analyzeTestRunnerConfig(projectRoot: string): {
    hasJest: boolean;
    hasMocha: boolean;
    hasVitest: boolean;
    hasOther: boolean;
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);

    const hasJest = sourceFiles.some(f =>
      UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.JEST_CONFIG.test(
        f
      )
    );

    const hasMocha = sourceFiles.some(f =>
      UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.MOCHA_CONFIG.test(
        f
      )
    );

    const hasVitest = sourceFiles.some(f =>
      UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.VITEST_CONFIG.test(
        f
      )
    );

    const hasOther =
      sourceFiles.some(f =>
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.KARMA_CONFIG.test(
          f
        )
      ) ||
      sourceFiles.some(f =>
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.PLAYWRIGHT_CONFIG.test(
          f
        )
      ) ||
      sourceFiles.some(f =>
        UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS.CYPRESS_CONFIG.test(
          f
        )
      );

    return {
      hasJest,
      hasMocha,
      hasVitest,
      hasOther,
    };
  }

  /**
   * Analyze overall automation readiness
   */
  static analyzeAutomationReadiness(projectRoot: string): {
    automationLevel: string;
    score: number;
    readinessDetails: Record<string, boolean>;
  } {
    const automation = this.analyzeTestAutomation(projectRoot);
    const cicd = this.analyzeCICDIntegration(projectRoot);

    const readinessDetails = {
      testScripts: automation.hasTestScripts,
      testRunner: automation.hasTestRunner,
      cicdConfig: cicd.hasCICDConfig,
      automatedTests: cicd.hasAutomatedTests,
      testEnvironment: automation.hasTestEnvironment,
      parallelization: automation.hasParallelization,
    };

    const automationLevel =
      UnitTestAutomationStandardsConstants.getAutomationLevel(
        automation.hasTestScripts,
        automation.hasTestRunner,
        cicd.hasCICDConfig,
        automation.hasTestEnvironment
      );

    let score = 100;
    if (!automation.hasTestScripts) score -= 25;
    if (!automation.hasTestRunner) score -= 20;
    if (!cicd.hasCICDConfig) score -= 20;
    if (!cicd.hasAutomatedTests) score -= 15;
    if (!automation.hasTestEnvironment) score -= 10;
    if (!automation.hasParallelization) score -= 10;

    return {
      automationLevel,
      score: Math.max(0, score),
      readinessDetails,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Check if test runner configuration exists
   */
  private static hasTestRunnerConfig(projectRoot: string): boolean {
    const sourceFiles = this.findSourceFiles(projectRoot);

    return Object.values(
      UnitTestAutomationStandardsConstants.TEST_RUNNER_CONFIG_PATTERNS
    ).some(pattern =>
      sourceFiles.some(f => PatternMatchingUtils.hasRegexPattern(f, pattern))
    );
  }

  /**
   * Check if test environment setup exists
   */
  private static hasTestEnvironmentSetup(projectRoot: string): boolean {
    const sourceFiles = this.findSourceFiles(projectRoot);

    return Object.values(
      UnitTestAutomationStandardsConstants.TEST_ENVIRONMENT_PATTERNS
    ).some(pattern =>
      sourceFiles.some(f => PatternMatchingUtils.hasRegexPattern(f, pattern))
    );
  }

  /**
   * Find all source files in project
   */
  private static findSourceFiles(projectRoot: string): string[] {
    return CheckerUtils.findAllCodeFiles(
      projectRoot,
      ConfigFileUtils.getMinimalDefaultConfig()
    );
  }
}
