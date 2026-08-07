import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestAutomationStandardsAnalyzerService } from './unit-test-automation-standards/services/automation-analyzer.service';

/**
 * Test Automation Standards Law
 *
 * Enforces comprehensive test automation practices and CI/CD integration
 * that checks for:
 * - Test scripts in package.json
 * - Test runner configuration
 * - CI/CD pipeline setup
 * - Automated test execution
 * - Test environment configuration
 * - Parallelization support
 *
 * Architecture:
 * - Coordinates automation analyzer service
 * - Configuration analysis: checks automation setup
 * - Integration analysis: verifies CI/CD connection
 */
export class TestAutomationStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;

      // 1. Analyze test automation setup
      const automationAnalysis =
        UnitTestAutomationStandardsAnalyzerService.analyzeTestAutomation(
          projectRoot
        );

      if (!automationAnalysis.hasTestScripts) {
        violations.push('Missing test scripts in package.json');
        suggestions.push('Add test script commands to package.json');
        score -= 25;
      }

      if (!automationAnalysis.hasTestRunner) {
        violations.push('No test runner configured');
        suggestions.push(
          'Install and configure Jest, Mocha, Vitest, or similar'
        );
        score -= 20;
      }

      if (!automationAnalysis.hasTestEnvironment) {
        violations.push('Test environment setup missing');
        suggestions.push(
          'Create test setup files and environment configuration'
        );
        score -= 10;
      }

      if (!automationAnalysis.hasParallelization) {
        suggestions.push('Configure test parallelization for faster execution');
        score -= 10;
      }

      // 2. Analyze CI/CD integration
      const cicdAnalysis =
        UnitTestAutomationStandardsAnalyzerService.analyzeCICDIntegration(
          projectRoot
        );

      if (!cicdAnalysis.hasCICDConfig) {
        violations.push('No CI/CD configuration found');
        suggestions.push(
          'Set up GitHub Actions, GitLab CI, Bitbucket Pipelines, or similar'
        );
        score -= 20;
      }

      if (cicdAnalysis.hasCICDConfig && !cicdAnalysis.hasAutomatedTests) {
        violations.push('CI/CD configured but tests not automated');
        suggestions.push('Add test execution to CI/CD pipeline');
        score -= 15;
      }

      // 3. Analyze test runner configuration
      const runnerAnalysis =
        UnitTestAutomationStandardsAnalyzerService.analyzeTestRunnerConfig(
          projectRoot
        );

      if (
        !runnerAnalysis.hasJest &&
        !runnerAnalysis.hasMocha &&
        !runnerAnalysis.hasVitest &&
        !runnerAnalysis.hasOther
      ) {
        suggestions.push('Configure a test runner (Jest recommended)');
        score -= 5;
      }

      // 4. Overall readiness assessment
      const readinessAnalysis =
        UnitTestAutomationStandardsAnalyzerService.analyzeAutomationReadiness(
          projectRoot
        );

      const passed = violations.length === 0;
      const message = this.generateMessage(
        violations.length,
        readinessAnalysis.automationLevel,
        cicdAnalysis
      );

      return {
        passed,
        message,
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        score: Math.max(0, score),
        config: context.config,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        score: 0,
        message: `❌ Test Automation Standards: Error analyzing automation - ${errorMessage}`,
        details: [],
        violations: [],
        suggestions: ['Check CI/CD configuration and automation setup'],
        config: context.config,
      };
    }
  }

  private static generateMessage(
    violationCount: number,
    automationLevel: string,
    cicdAnalysis: { hasCICDConfig: boolean; hasAutomatedTests: boolean }
  ): string {
    if (violationCount === 0) {
      return '✅ Test Automation Standards: Excellent automation setup';
    }

    if (!cicdAnalysis.hasCICDConfig) {
      return '⚠️ Test Automation Standards: No CI/CD configuration found';
    }

    if (!cicdAnalysis.hasAutomatedTests) {
      return '⚠️ Test Automation Standards: CI/CD configured but tests not automated';
    }

    return `⚠️ Test Automation Standards: ${automationLevel} automation readiness`;
  }
}
