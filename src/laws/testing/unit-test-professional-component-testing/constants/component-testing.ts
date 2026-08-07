import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * UnitTestProfessionalComponentTestingConstants
 *
 * Centralized configuration for component testing validation patterns.
 * All component testing rules, thresholds, and pattern matching logic.
 *
 * Patterns covered:
 * - Component file discovery (.component.ts)
 * - Test file coverage (.component.spec.ts)
 * - Component testing patterns (Input/Output, lifecycle, user interaction)
 * - Mocking and isolation patterns (TestBed, spies, service mocks)
 * - TestBed configuration patterns
 * - Test quality indicators
 *
 * Single source of truth for all component testing validation rules.
 */
export class UnitTestProfessionalComponentTestingConstants {
  // Component file patterns
  static readonly COMPONENT_FILE_PATTERN = /\.component\.ts$/;
  static readonly COMPONENT_SPEC_PATTERN = /\.component\.spec\.ts$/;

  // Test quality patterns
  static readonly TEST_QUALITY_PATTERNS = {
    DESCRIBE: /describe\s*\(\s*['"][^'"]+['"]\s*,/,
    PROPER_IT: /it\s*\(\s*['"][^'"]+['"]\s*,/,
    ASSERTION: /expect\s*\(/,
    BEFORE_EACH: /beforeEach\s*\(/,
    TESTBED_USAGE: /TestBed/,
  };

  // Component testing patterns
  static readonly INPUT_OUTPUT_PATTERNS = {
    INPUT_PROPERTY: /@Input/,
    OUTPUT_PROPERTY: /@Output/,
    EVENT_EMIT: /\.emit\s*\(/,
    PROPERTY_SETTING: /component\.\w+\s*=/,
    EVENT_SUBSCRIPTION: /\.subscribe\s*\(/,
  };

  // Lifecycle testing patterns
  static readonly LIFECYCLE_PATTERNS = {
    ON_INIT: /ngOnInit/,
    ON_DESTROY: /ngOnDestroy/,
    ON_CHANGES: /ngOnChanges/,
    AFTER_VIEW_INIT: /ngAfterViewInit/,
    DETECT_CHANGES: /detectChanges\s*\(/,
  };

  // User interaction testing patterns
  static readonly USER_INTERACTION_PATTERNS = {
    CLICK_EVENT: /click\s*\(/,
    EVENT_TRIGGER: /\.trigger\s*\(/,
    EVENT_DISPATCH: /dispatchEvent\s*\(/,
    DOM_QUERY: /querySelector/,
    TESTING_LIBRARY_QUERIES: /getByText|getByRole/,
  };

  // Assertion patterns
  static readonly ASSERTION_PATTERNS = {
    TO_BE: /expect\s*\([^)]+\)\.toBe/,
    TO_EQUAL: /expect\s*\([^)]+\)\.toEqual/,
    TO_HAVE_BEEN_CALLED: /expect\s*\([^)]+\)\.toHaveBeenCalled/,
    TO_CONTAIN: /expect\s*\([^)]+\)\.toContain/,
    TO_BE_TRUTHY: /expect\s*\([^)]+\)\.toBeTruthy/,
  };

  // TestBed mocking patterns
  static readonly TESTBED_PATTERNS = {
    CONFIG: /TestBed\.configureTestingModule/,
    PROVIDERS: /providers\s*:\s*\[/,
    IMPORTS: /imports\s*:\s*\[/,
    DECLARATIONS: /declarations\s*:\s*\[/,
  };

  // Spy patterns
  static readonly SPY_PATTERNS = {
    JASMINE_SPY: /spyOn\s*\(/,
    JEST_SPY: /jest\.spyOn\s*\(/,
    CREATE_SPY: /createSpy\s*\(/,
    RETURN_VALUE: /\.and\.returnValue\s*\(/,
  };

  // Service mocking patterns
  static readonly SERVICE_MOCKING_PATTERNS = {
    MOCK_PROVIDER: /MockProvider/,
    SERVICE_PROVIDER: /provide\s*:\s*\w+Service/,
    USE_VALUE: /useValue\s*:\s*\{/,
    SPY_OBJ: /jasmine\.createSpyObj/,
  };

  // Scoring thresholds
  static readonly COVERAGE_THRESHOLDS = {
    EXCELLENT: 95,
    VERY_GOOD: 85,
    GOOD: 75,
    ACCEPTABLE: 60,
    POOR: 40,
    CRITICAL: 0,
  };

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    MISSING_SPEC_FILE: 5,
    LOW_QUALITY_TEST: 3,
    MISSING_PATTERNS: 25,
    MISSING_MOCKING: 20,
    MISSING_TESTBED: 10,
  };

  // Minimum test count threshold
  static readonly MINIMUM_TESTS_PER_FILE = 2;

  /**
   * Check if filename is a component file
   */
  static isComponentFile(filename: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      filename,
      this.COMPONENT_FILE_PATTERN
    );
  }

  /**
   * Check if filename is a component spec file
   */
  static isComponentSpecFile(filename: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      filename,
      this.COMPONENT_SPEC_PATTERN
    );
  }

  /**
   * Check if content has basic test quality indicators
   */
  static hasQualityTestContent(content: string): boolean {
    const hasBasicStructure = Object.values(this.TEST_QUALITY_PATTERNS).some(
      pattern => PatternMatchingUtils.hasRegexPattern(content, pattern)
    );

    const testCount = (content.match(/it\s*\(/g) ?? []).length;
    return hasBasicStructure && testCount >= this.MINIMUM_TESTS_PER_FILE;
  }

  /**
   * Check if content has input/output testing
   */
  static hasInputOutputTesting(content: string): boolean {
    return Object.values(this.INPUT_OUTPUT_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has lifecycle testing
   */
  static hasLifecycleTesting(content: string): boolean {
    return Object.values(this.LIFECYCLE_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has user interaction testing
   */
  static hasUserInteractionTesting(content: string): boolean {
    return Object.values(this.USER_INTERACTION_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has proper assertions
   */
  static hasProperAssertions(content: string): boolean {
    return Object.values(this.ASSERTION_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has TestBed mocking
   */
  static hasTestBedMocking(content: string): boolean {
    return Object.values(this.TESTBED_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has spy usage
   */
  static hasSpyUsage(content: string): boolean {
    return Object.values(this.SPY_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has service mocking
   */
  static hasServiceMocking(content: string): boolean {
    return Object.values(this.SERVICE_MOCKING_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has proper TestBed configuration
   */
  static hasProperTestBedConfiguration(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      /TestBed\.configureTestingModule\s*\(\s*\{/
    );
  }

  /**
   * Check if content has module configuration
   */
  static hasModuleConfiguration(content: string): boolean {
    const patterns = [/imports\s*:\s*\[.*\]/s, /providers\s*:\s*\[.*\]/s];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has component declaration or imports (standalone support)
   */
  static hasComponentDeclaration(content: string): boolean {
    // Support both traditional declarations and modern imports (standalone components)
    const declarationsPattern = /declarations\s*:\s*\[.*\]/s;
    const importsPattern = /imports\s*:\s*\[.*\]/s;

    return (
      PatternMatchingUtils.hasRegexPattern(content, declarationsPattern) ||
      PatternMatchingUtils.hasRegexPattern(content, importsPattern)
    );
  }

  /**
   * Determine if component testing is proper (all criteria met)
   */
  static hasProperComponentTesting(content: string): boolean {
    const hasAssertions = this.hasProperAssertions(content);
    const hasInputOutput =
      this.hasInputOutputTesting(content) ||
      this.hasUserInteractionTesting(content);

    return hasAssertions && hasInputOutput;
  }

  /**
   * Determine if mocking and isolation is proper
   */
  static hasProperMockingAndIsolation(content: string): boolean {
    return this.hasTestBedMocking(content) || this.hasSpyUsage(content);
  }

  /**
   * Determine if TestBed usage is proper
   */
  static hasProperTestBedUsage(content: string): boolean {
    return (
      this.hasProperTestBedConfiguration(content) &&
      this.hasComponentDeclaration(content)
    );
  }

  /**
   * Get score based on coverage percentage
   */
  static getScoreForCoverage(coveragePercent: number): number {
    if (coveragePercent >= this.COVERAGE_THRESHOLDS.EXCELLENT) {
      return 100;
    } else if (coveragePercent >= this.COVERAGE_THRESHOLDS.VERY_GOOD) {
      return 95;
    } else if (coveragePercent >= this.COVERAGE_THRESHOLDS.GOOD) {
      return 85;
    } else if (coveragePercent >= this.COVERAGE_THRESHOLDS.ACCEPTABLE) {
      return 70;
    } else if (coveragePercent >= this.COVERAGE_THRESHOLDS.POOR) {
      return 50;
    }
    return 20;
  }
}
