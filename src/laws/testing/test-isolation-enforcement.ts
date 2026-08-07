import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestIsolationAnalyzerService } from './unit-test-isolation/services/isolation-analyzer.service';

/**
 * Test Isolation Enforcement Law
 *
 * Comprehensive test isolation implementation that checks for:
 * - Test independence (no shared mutable state)
 * - Proper test cleanup and teardown
 * - No cross-test dependencies
 * - Proper beforeEach/afterEach usage
 * - No test order dependencies
 * - Clean slate for each test
 *
 * Architecture:
 * - Coordinates isolation analyzer service
 * - File discovery: finds test files
 * - Isolation analysis: checks test independence
 */
export class TestIsolationEnforcementLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const analysisResult = this.runAllAnalyses(context);
      return this.buildFinalResult(context, analysisResult);
    } catch (error: unknown) {
      return this.buildErrorResult(context, error);
    }
  }

  /**
   * Run all isolation analyses and aggregate results
   */
  private static runAllAnalyses(context: LawCheckContext): {
    violations: string[];
    suggestions: string[];
    score: number;
    sharedStateAnalysis: { hasSharedMutableState: boolean };
    setupTeardownAnalysis: { hasProperIsolation: boolean };
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;
    const analyzer = UnitTestIsolationAnalyzerService;

    // Initialize configurable thresholds
    const thresholds = {
      sharedMutableStateDeduction:
        config.thresholds?.testing?.isolation?.sharedMutableStateDeduction ??
        30,
      missingSetupTeardownDeduction:
        config.thresholds?.testing?.isolation?.missingSetupTeardownDeduction ??
        25,
      orderDependenciesDeduction:
        config.thresholds?.testing?.isolation?.orderDependenciesDeduction ?? 25,
      resourceIsolationDeduction:
        config.thresholds?.testing?.isolation?.resourceIsolationDeduction ?? 20,
      globalStatePollutionDeduction:
        config.thresholds?.testing?.isolation?.globalStatePollutionDeduction ??
        15,
      missingIsolationPatternsDeduction:
        config.thresholds?.testing?.isolation
          ?.missingIsolationPatternsDeduction ?? 10,
    };

    // 1. Check for shared mutable state between tests
    const sharedStateAnalysis = analyzer.analyzeSharedState(
      projectRoot,
      config
    );
    if (sharedStateAnalysis.hasSharedMutableState) {
      violations.push('Tests share mutable state that can cause interference');
      suggestions.push(
        'Move shared variables inside test functions or beforeEach blocks'
      );
      score -= thresholds.sharedMutableStateDeduction;
    }

    // 2. Check for proper test setup/teardown isolation
    const setupTeardownAnalysis = analyzer.analyzeSetupTeardown(
      projectRoot,
      config
    );
    if (!setupTeardownAnalysis.hasProperIsolation) {
      violations.push('Tests missing proper isolation in setup/teardown');
      suggestions.push(
        'Implement comprehensive beforeEach/afterEach for test isolation'
      );
      score -= thresholds.missingSetupTeardownDeduction;
    }

    // 3-6. Additional isolation checks
    score = this.checkAdditionalIsolation(
      context,
      violations,
      suggestions,
      score,
      thresholds
    );

    return {
      violations,
      suggestions,
      score: Math.max(0, score),
      sharedStateAnalysis,
      setupTeardownAnalysis,
    };
  }

  /**
   * Check additional isolation requirements
   */
  private static checkAdditionalIsolation(
    context: LawCheckContext,
    violations: string[],
    suggestions: string[],
    score: number,
    thresholds: {
      orderDependenciesDeduction: number;
      resourceIsolationDeduction: number;
      globalStatePollutionDeduction: number;
      missingIsolationPatternsDeduction: number;
    }
  ): number {
    const { projectRoot, config } = context;
    const analyzer = UnitTestIsolationAnalyzerService;

    // 3. Check for test order dependencies
    const orderDependencyAnalysis = analyzer.analyzeTestOrderDependencies(
      projectRoot,
      config
    );
    if (orderDependencyAnalysis.hasOrderDependencies) {
      violations.push('Tests appear to have order dependencies');
      suggestions.push('Ensure tests can run independently in any order');
      score -= thresholds.orderDependenciesDeduction;
    }

    // 4. Check for external resource isolation
    const resourceIsolationAnalysis = analyzer.analyzeResourceIsolation(
      projectRoot,
      config
    );
    if (!resourceIsolationAnalysis.hasProperResourceIsolation) {
      violations.push('External resources not properly isolated between tests');
      suggestions.push('Mock or properly clean up external dependencies');
      score -= thresholds.resourceIsolationDeduction;
    }

    // 5. Check for DOM/global state pollution
    const globalStateAnalysis = analyzer.analyzeGlobalStatePollution(
      projectRoot,
      config
    );
    if (globalStateAnalysis.hasGlobalStatePollution) {
      suggestions.push('Clean up global state modifications in tests');
      score -= thresholds.globalStatePollutionDeduction;
    }

    // 6. Check test framework isolation patterns
    const frameworkAnalysis = analyzer.analyzeTestFrameworkIsolation(
      projectRoot,
      config
    );
    if (!frameworkAnalysis.usesIsolationPatterns) {
      suggestions.push(
        'Use test framework isolation features (describe blocks, proper mocking)'
      );
      score -= thresholds.missingIsolationPatternsDeduction;
    }

    return score;
  }

  /**
   * Build the final result
   */
  private static buildFinalResult(
    context: LawCheckContext,
    analysisResult: {
      violations: string[];
      suggestions: string[];
      score: number;
      sharedStateAnalysis: { hasSharedMutableState: boolean };
      setupTeardownAnalysis: { hasProperIsolation: boolean };
    }
  ): LawResult {
    const {
      violations,
      suggestions,
      score,
      sharedStateAnalysis,
      setupTeardownAnalysis,
    } = analysisResult;
    const passed = violations.length === 0;
    const message = this.generateMessage(
      violations.length,
      sharedStateAnalysis,
      setupTeardownAnalysis
    );

    return {
      passed,
      message,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score,
      config: context.config,
    };
  }

  /**
   * Build error result
   */
  private static buildErrorResult(
    context: LawCheckContext,
    error: unknown
  ): LawResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      score: 0,
      message: `❌ Test Isolation Enforcement: Error analyzing isolation - ${errorMessage}`,
      details: [],
      violations: [],
      suggestions: ['Check project structure and test configuration'],
      config: context.config,
    };
  }

  private static generateMessage(
    violationCount: number,
    sharedStateAnalysis: { hasSharedMutableState: boolean },
    setupTeardownAnalysis: { hasProperIsolation: boolean }
  ): string {
    if (violationCount === 0) {
      return '✅ Test Isolation Enforcement: Excellent test isolation practices';
    }

    const issues = [];
    if (sharedStateAnalysis.hasSharedMutableState)
      issues.push('shared mutable state');
    if (!setupTeardownAnalysis.hasProperIsolation)
      issues.push('poor setup/teardown isolation');

    return `⚠️ Test Isolation issues: ${issues.join(', ')}`;
  }
}
