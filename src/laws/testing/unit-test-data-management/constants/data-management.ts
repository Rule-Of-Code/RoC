import { CodeText } from '../../../../utils/code-text';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { FixtureIsolation } from '../../../../utils/testing/fixture-isolation';

/**
 * Unit Test Data Management Constants
 *
 * Centralized test data patterns and helper methods
 * for identifying proper data management practices in test suites.
 *
 * Patterns cover:
 * - Test data setup and teardown
 * - Test data factories and builders
 * - Mock data organization
 * - Hardcoded data detection
 * - Shared state issues
 * - Resource cleanup
 */
export class UnitTestDataManagementConstants {
  // ============================================
  // 1. Setup/Teardown Patterns
  // ============================================

  static readonly SETUP_TEARDOWN_PATTERNS = {
    BEFORE_EACH: /beforeEach\s*\(/,
    BEFORE_ALL: /beforeAll\s*\(/,
    AFTER_EACH: /afterEach\s*\(/,
    AFTER_ALL: /afterAll\s*\(/,
    BEFORE_HOOK: /before\s*\(/,
    AFTER_HOOK: /after\s*\(/,
  };

  // ============================================
  // 2. Data Factory Patterns
  // ============================================

  static readonly FACTORY_PATTERNS = {
    FACTORY_METHOD: /factory\.|Builder\.|\.create\(|\.make\(|\.build\(/,
    MOCK_DATA_IMPORT: /from\s+['"][^'"]*mock|fixture|builder['"]/,
    TEST_DATA_IMPORT: /from\s+['"][^'"]*test[_-]?data['"]/,
  };

  // ============================================
  // 3. Hardcoded Data Patterns
  // ============================================

  static readonly HARDCODED_DATA_PATTERNS = {
    HARDCODED_ID_ARRAY:
      /const\s+\w+\s*=\s*\[\s*\{[^}]*id:\s*['"]\d+['"][^}]*\}/,
    MOCK_WITH_NUMBER: /\.mockReturnValue\(\s*\d{4,}\s*\)/,
    LONG_STRING_ASSERTION: /expect\([^)]+\)\.toBe\(\s*['"][^'"]{20,}['"]\s*\)/,
  };

  // ============================================
  // 4. Shared State Patterns
  // ============================================

  static readonly SHARED_STATE_PATTERNS = {
    // Only MODULE-scope (column 0) mutable bindings are genuine cross-test shared
    // state. An INDENTED `let x = ...` is a normal local inside a describe / test /
    // helper (e.g. `let result = reducer(...)`) and must NOT be flagged.
    MODULE_LET: /^let\s+\w+\s*=\s*[^;]*;$/m,
    MODULE_VAR: /^var\s+\w+\s*=\s*[^;]*;$/m,
    WINDOW_ASSIGNMENT: /window\.\w+\s*=/,
    GLOBAL_ASSIGNMENT: /global\.\w+\s*=/,
  };

  // ============================================
  // 5. External Resource Patterns
  // ============================================

  // Resources that genuinely need EXPLICIT teardown in a test (open handles /
  // connections / persistent storage). HTTP requests (HttpClient/fetch) are NOT
  // here: they leave no handle to close — the framework/GC reclaims them — so a
  // stateless API/integration test must not be flagged for "missing cleanup".
  static readonly EXTERNAL_RESOURCE_PATTERNS = {
    DATABASE: /database|db\.|createConnection|\.connect\(/i,
    STORAGE: /localStorage|sessionStorage/,
    FILE_HANDLE: /createReadStream|createWriteStream|fs\.open\(/,
    WEBSOCKET: /new WebSocket|io\(|socket\./i,
    TIMER: /setInterval\(/,
  };

  // ============================================
  // 6. Resource Cleanup Patterns
  // ============================================

  static readonly CLEANUP_PATTERNS = {
    CLOSE: /\.close\(\)/,
    DISCONNECT: /\.disconnect\(\)/,
    CLEAR: /\.clear\(\)/,
    REMOVE_ITEM: /\.removeItem\(/,
    MOCK_RESTORE: /\.mockRestore\(\)/,
    MOCK_CLEAR: /\.mockClear\(\)/,
    // The jest-global resets an afterEach() commonly uses — the `.clear()` above
    // does not match `clearAllMocks()`, so a suite that cleans up the standard
    // way was reported as having none.
    JEST_GLOBAL_RESET: /jest\.(clearAllMocks|resetAllMocks|restoreAllMocks)\(/,
    // Angular TestBed tears down the module/components/providers automatically
    // between specs (resetTestingModule), so these are valid resource cleanup too.
    COMPONENT_DESTROY: /\.destroy\(\)/,
    RESET_TESTBED: /resetTestingModule|TestBed\b/,
    UNSUBSCRIBE: /\.unsubscribe\(\)/,
  };

  // ============================================
  // 7. Mocking Framework Patterns
  // ============================================

  static readonly MOCKING_PATTERNS = {
    JEST_MOCK: /jest\.mock|jest\.spyOn/,
    SINON_MOCK: /sinon\./,
    SPY_ON: /spyOn/,
    CREATE_MOCK: /createMock/,
    VI_MOCK: /vi\.mock/,
    // Recognise the ordinary ways browser globals get mocked, which the list
    // above missed — so a suite that mocks localStorage/Document/matchMedia via
    // Object.defineProperty + jest.fn() is no longer reported as "not mocked".
    JEST_FN: /jest\.fn\(/,
    MOCK_IMPL: /mockImplementation|mockReturnValue|mockResolvedValue|mockRejectedValue/,
    DEFINE_PROPERTY: /Object\.defineProperty/,
  };

  // ============================================
  // 8. Test Structure Patterns
  // ============================================

  static readonly TEST_STRUCTURE_PATTERNS = {
    DESCRIBE: /describe\s*\(/,
    IT_TEST: /it\s*\(|test\s*\(/,
    EXPECT: /expect\s*\(/,
  };

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if content has proper setup/teardown
   */
  static hasProperSetupTeardown(content: string): boolean {
    // The runner can supply per-test data isolation instead of a hook; see
    // FixtureIsolation. Second site of the same check, so it gets the same
    // answer — a project should not pass one isolation law and fail its twin.
    if (FixtureIsolation.isFixtureIsolated(content)) return true;

    const hasBeforeEach = PatternMatchingUtils.hasRegexPattern(
      content,
      this.SETUP_TEARDOWN_PATTERNS.BEFORE_EACH
    );
    const hasAfterEach = PatternMatchingUtils.hasRegexPattern(
      content,
      this.SETUP_TEARDOWN_PATTERNS.AFTER_EACH
    );

    const hasTests = this.hasTestStructure(content);
    return !hasTests || hasBeforeEach || hasAfterEach;
  }

  /**
   * Check if content has hardcoded test data
   */
  static hasHardcodedTestData(content: string): boolean {
    return Object.values(this.HARDCODED_DATA_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has shared mutable state
   */
  static hasSharedMutableState(content: string): boolean {
    // Prose is not code: a comment saying why a `window.x =` was removed must
    // not be read as the assignment itself.
    const code = CodeText.stripComments(content);
    return Object.values(this.SHARED_STATE_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(code, pattern)
    );
  }

  /**
   * Check if content uses external resources
   */
  static usesExternalResources(content: string): boolean {
    // A comment that DESCRIBES a resource is not a test that reaches one.
    const code = CodeText.stripComments(content);
    return Object.values(this.EXTERNAL_RESOURCE_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(code, pattern)
    );
  }

  /**
   * Check if content has resource cleanup
   */
  static hasResourceCleanup(content: string): boolean {
    return Object.values(this.CLEANUP_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has proper mocking
   */
  static hasProperMocking(content: string): boolean {
    const hasMockingFramework = Object.values(this.MOCKING_PATTERNS).some(
      pattern => PatternMatchingUtils.hasRegexPattern(content, pattern)
    );

    const hasExternalDependencies =
      content.includes('import') && content.includes('from');

    return !hasExternalDependencies || hasMockingFramework;
  }

  /**
   * Check if content uses test data factories
   */
  static usesTestDataFactories(content: string): boolean {
    return Object.values(this.FACTORY_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has test structure (describe/it/test)
   */
  static hasTestStructure(content: string): boolean {
    return Object.values(this.TEST_STRUCTURE_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Get data management quality level based on score
   */
  static getDataManagementLevel(
    hasSetup: boolean,
    hasHardcoded: boolean,
    hasSharedState: boolean
  ): string {
    let score = 100;
    if (!hasSetup) score -= 30;
    if (hasHardcoded) score -= 25;
    if (hasSharedState) score -= 25;

    return score >= 100 ? 'EXCELLENT' : 'CRITICAL';
  }

  /**
   * Get score deduction for data management issues
   */
  static getScoreDeduction(level: string): number {
    const deductions: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 15,
      ACCEPTABLE: 30,
      POOR: 50,
      CRITICAL: 70,
    };

    return deductions[level] ?? 0;
  }

  /**
   * Calculate cleanup necessity based on resource usage
   */
  static shouldHaveCleanup(content: string): boolean {
    return this.usesExternalResources(content);
  }
}
