import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { withViolationDetails } from '../../utils/violation-details';
import { UnitTestProfessionalComponentTestingAnalyzerService } from './unit-test-professional-component-testing/services/component-testing-analyzer.service';
import { ReactComponentTestingAnalyzer } from './unit-test-professional-component-testing/services/react-component-testing';
import { VueComponentTestingAnalyzer } from './unit-test-professional-component-testing/services/vue-component-testing';

/** The deductions Professional Component Testing Policy judges with. */
type ComponentThresholds = ReturnType<
  (typeof ProfessionalComponentTestingPolicyLaw)['thresholdsOf']
>;

/** How the React and the Vue findings are worded. */
interface FrameworkWords {
  missing: string;
  missingDetail: string;
  missingSuggestion: string;
  lowQuality: string;
  lowQualityDetail: string;
  lowQualitySuggestion: string;
}

const REACT: FrameworkWords = {
  missing: 'React components missing a co-located .test.tsx / .spec.tsx',
  missingDetail: 'React component without a co-located test',
  missingSuggestion: 'Add X.test.tsx next to X.tsx (or __tests__/X.test.tsx)',
  lowQuality:
    'React component tests do not query by role and assert, in at least two tests',
  lowQualityDetail:
    'React component test that does not query by role and assert in two tests',
  lowQualitySuggestion:
    "Query the rendered component by role (screen.getByRole('button', { name: … })) and assert on what the user sees",
};

/** Vue single-file components (#12). */
const VUE: FrameworkWords = {
  missing: 'Vue components missing a co-located .spec.ts / .test.ts',
  missingDetail: 'Vue component without a co-located test',
  missingSuggestion: 'Add X.spec.ts next to X.vue (or __tests__/X.spec.ts)',
  lowQuality:
    'Vue component tests do not mount the component with @vue/test-utils or @testing-library/vue and assert, in at least two tests',
  lowQualityDetail:
    'Vue component test that does not mount it and assert in two tests',
  lowQualitySuggestion:
    'Mount the component with @vue/test-utils (mount) or @testing-library/vue (render) and assert on what the user sees, in at least two tests',
};

/**
 * Professional Component Testing Policy Law
 *
 * Validates professional component testing practices including:
 * - Component test file coverage (.spec.ts files for all components)
 * - Test quality standards (proper describe/it blocks, assertions)
 * - Component testing patterns (Input/Output, lifecycle, user interaction)
 * - Mocking and isolation patterns (TestBed, spies, service mocks)
 * - TestBed configuration and component declarations
 *
 * Delegates all analysis to the specialized analyzer service.
 * Pure coordinator - only aggregates results and returns LawResult.
 */
export class ProfessionalComponentTestingPolicyLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const violations: string[] = [];
      const suggestions: string[] = [];
      // Every file behind a count or an "(e.g. a, b, c, …)" list (#43).
      const details: ViolationDetail[] = [];
      let score = 100;
      const { projectRoot, config } = context;

      // Get thresholds from config with defaults
      const thresholds = this.thresholdsOf(config);

      // 1. Analyze component test coverage
      const componentAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeComponentTestCoverage(
          projectRoot,
          config
        );

      if (componentAnalysis.missingTestFiles.length > 0) {
        violations.push(
          `${componentAnalysis.missingTestFiles.length} components missing .spec.ts files`
        );
        details.push(
          ...this.fileDetails(
            context,
            componentAnalysis.missingTestFiles,
            'component without a .spec.ts file'
          )
        );
        suggestions.push('Create .spec.ts files for all components');
        score -= Math.min(
          thresholds.maxMissingSpecDeduction,
          componentAnalysis.missingTestFiles.length *
            thresholds.missingSpecFileDeduction
        );
      }

      // 1b. React components (.tsx/.jsx) and their co-located tests. The
      // Angular-only checks below (patterns, mocking, TestBed) judge the
      // Angular specs only; a React test is judged by its role queries.
      const react = ReactComponentTestingAnalyzer.analyze(context);
      // 1c. Vue single-file components and their tests (#12), judged by
      // whether the test mounts the component and asserts.
      const vue = VueComponentTestingAnalyzer.analyze(context);
      const out = { violations, suggestions, details };
      score = this.frameworkFindings(
        context,
        react,
        REACT,
        thresholds,
        out,
        score
      );
      score = this.frameworkFindings(context, vue, VUE, thresholds, out, score);
      const judgedNothing =
        componentAnalysis.totalComponents === 0 &&
        react.components.length === 0 &&
        vue.components.length === 0;
      if (judgedNothing) {
        violations.push(
          'found no component files (Angular components — *.component.ts or a file with @Component — under src/, apps/, libs/; .tsx/.jsx and .vue through the scan) — this law judged nothing'
        );
      }

      // 2. Analyze test quality
      const testQualityAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeTestQuality(
          componentAnalysis.testFiles
        );

      if (testQualityAnalysis.lowQualityTests.length > 0) {
        violations.push(
          `${testQualityAnalysis.lowQualityTests.length} component tests have low quality`
        );
        details.push(
          ...this.fileDetails(
            context,
            testQualityAnalysis.lowQualityTests,
            'component test of low quality'
          )
        );
        suggestions.push(
          'Improve component test quality with proper assertions and coverage'
        );
        score -= Math.min(
          thresholds.maxLowQualityDeduction,
          testQualityAnalysis.lowQualityTests.length *
            thresholds.lowQualityTestDeduction
        );
      }

      // 3-5. Testing patterns, mocking and isolation, TestBed usage
      score = this.practiceFindings(
        componentAnalysis.testFiles,
        thresholds,
        violations,
        suggestions,
        score
      );

      // Fail on violations, not on score: the missing-TestBed deduction lowered
      // score without a violation, so a spec passing every listed check but with
      // no proper TestBed returned passed:false, an EMPTY violation list, and a
      // green "✅ Excellent" message — a check-mark on a failing verdict.
      // A law that judged nothing earns no score: it scored 100 here, which
      // contradicted its own passed:false and counted as perfect overall.
      const finalScore = judgedNothing ? 0 : Math.max(0, score);

      return withViolationDetails(
        {
          ...(judgedNothing ? { judgedNothing: true } : {}),
          passed: violations.length === 0,
          message: this.generateMessage(
            violations.length,
            componentAnalysis,
            testQualityAnalysis
          ),
          details: [...violations, ...suggestions],
          violations,
          suggestions,
          score: finalScore,
          fixable: true,
          config: context.config,
        },
        details
      );
    } catch (error) {
      return {
        passed: false,
        message:
          '❌ Professional Component Testing Policy: Error during analysis',
        details: [
          `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        violations: [],
        suggestions: ['Check project structure and component files'],
        score: 0,
        fixable: false,
        config: context.config,
      };
    }
  }

  /** The deductions and their caps, with their defaults. */
  private static thresholdsOf(config: LawCheckContext['config']) {
    return {
      missingSpecFileDeduction:
        config.thresholds?.testing?.componentTesting
          ?.missingSpecFileDeduction ?? 5,
      maxMissingSpecDeduction:
        config.thresholds?.testing?.componentTesting?.maxMissingSpecDeduction ??
        50,
      lowQualityTestDeduction:
        config.thresholds?.testing?.componentTesting?.lowQualityTestDeduction ??
        3,
      maxLowQualityDeduction:
        config.thresholds?.testing?.componentTesting?.maxLowQualityDeduction ??
        30,
      missingPatternsDeduction:
        config.thresholds?.testing?.componentTesting
          ?.missingPatternsDeduction ?? 25,
      missingMockingDeduction:
        config.thresholds?.testing?.componentTesting?.missingMockingDeduction ??
        20,
      missingTestBedDeduction:
        config.thresholds?.testing?.componentTesting?.missingTestBedDeduction ??
        10,
    };
  }

  /**
   * React or Vue components without a co-located test, and tests that fall
   * short of the framework's quality bar; returns the score left.
   */
  private static frameworkFindings(
    context: LawCheckContext,
    found: { missingTestFiles: string[]; lowQualityTests: string[] },
    words: FrameworkWords,
    thresholds: ComponentThresholds,
    out: {
      violations: string[];
      suggestions: string[];
      details: ViolationDetail[];
    },
    score: number
  ): number {
    let remaining = score;
    if (found.missingTestFiles.length > 0) {
      out.violations.push(
        `${found.missingTestFiles.length} ${words.missing} (e.g. ${this.firstFew(context, found.missingTestFiles)})`
      );
      out.details.push(
        ...this.fileDetails(
          context,
          found.missingTestFiles,
          words.missingDetail
        )
      );
      out.suggestions.push(words.missingSuggestion);
      remaining -= Math.min(
        thresholds.maxMissingSpecDeduction,
        found.missingTestFiles.length * thresholds.missingSpecFileDeduction
      );
    }
    if (found.lowQualityTests.length > 0) {
      out.violations.push(
        `${found.lowQualityTests.length} ${words.lowQuality} (e.g. ${this.firstFew(context, found.lowQualityTests)})`
      );
      out.details.push(
        ...this.fileDetails(
          context,
          found.lowQualityTests,
          words.lowQualityDetail
        )
      );
      out.suggestions.push(words.lowQualitySuggestion);
      remaining -= Math.min(
        thresholds.maxLowQualityDeduction,
        found.lowQualityTests.length * thresholds.lowQualityTestDeduction
      );
    }
    return remaining;
  }

  /** The Angular specs' patterns, mocking and TestBed; returns the score left. */
  private static practiceFindings(
    testFiles: ReturnType<
      typeof UnitTestProfessionalComponentTestingAnalyzerService.analyzeComponentTestCoverage
    >['testFiles'],
    thresholds: ComponentThresholds,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let remaining = score;
    // 3. Analyze component testing patterns
    const testPatterns =
      UnitTestProfessionalComponentTestingAnalyzerService.analyzeComponentTestPatterns(
        testFiles
      );

    if (!testPatterns.hasProperPatterns) {
      violations.push('Component tests missing essential testing patterns');
      suggestions.push(
        'Add input/output testing, lifecycle testing, and user interaction testing'
      );
      remaining -= thresholds.missingPatternsDeduction;
    }

    // 4. Analyze mocking and isolation
    const mockingAnalysis =
      UnitTestProfessionalComponentTestingAnalyzerService.analyzeMockingPatterns(
        testFiles
      );

    if (!mockingAnalysis.hasProperMocking) {
      violations.push('Component tests missing proper mocking and isolation');
      suggestions.push(
        'Use TestBed, spies, and mocks for proper component isolation'
      );
      remaining -= thresholds.missingMockingDeduction;
    }

    // 5. Analyze TestBed usage
    const testBedAnalysis =
      UnitTestProfessionalComponentTestingAnalyzerService.analyzeTestBedUsage(
        testFiles
      );

    if (!testBedAnalysis.hasProperTestBedUsage) {
      suggestions.push(
        'Improve TestBed configuration for more robust component testing'
      );
      remaining -= thresholds.missingTestBedDeduction;
    }
    return remaining;
  }

  /** Every file behind a count, relative to the project (#43). */
  private static fileDetails(
    context: LawCheckContext,
    files: readonly string[],
    message: string
  ): ViolationDetail[] {
    return files.map(file => ({
      file: PathOperations.getRelative(context.projectRoot, file),
      message,
    }));
  }

  /** Up to three files, relative, for a message. */
  private static firstFew(context: LawCheckContext, files: string[]): string {
    const shown = files
      .slice(0, 3)
      .map(file => PathOperations.getRelative(context.projectRoot, file));
    return files.length > 3 ? `${shown.join(', ')}, …` : shown.join(', ');
  }

  private static generateMessage(
    violationCount: number,
    componentAnalysis: { missingTestFiles: string[] },
    testQualityAnalysis: { lowQualityTests: string[] }
  ): string {
    if (violationCount === 0) {
      return '✅ Professional Component Testing Policy: Excellent component testing practices';
    }

    if (componentAnalysis.missingTestFiles.length > 0) {
      return `⚠️ Professional Component Testing: ${componentAnalysis.missingTestFiles.length} components missing tests`;
    }

    if (testQualityAnalysis.lowQualityTests.length > 0) {
      return `⚠️ Professional Component Testing: ${testQualityAnalysis.lowQualityTests.length} tests need quality improvement`;
    }

    return `⚠️ Professional Component Testing: ${violationCount} issues found`;
  }
}
