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
    // Clients and calls, not words: `/database/i` matched any identifier
    // naming a database and `io\(` matched `radio(`.
    DATABASE: /\bdb\.\w+\s*\(|\.connect\s*\(|\bcreateConnection\s*\(|\bcreatePool\s*\(|\bnew\s+(?:Pool|PrismaClient|Sequelize)\s*\(|\bknex\s*\(/,
    STORAGE: /localStorage|sessionStorage/,
    FILE_HANDLE: /createReadStream|createWriteStream|fs\.open\(/,
    WEBSOCKET: /\bnew\s+WebSocket\s*\(|\bio\s*\(|\bsocket\.(?:emit|on|send|connect)\s*\(/,
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
    VI_FN: /\bvi\.fn\(/,
    MOCK_IMPL: /mockImplementation|mockReturnValue|mockResolvedValue|mockRejectedValue/,
    DEFINE_PROPERTY: /Object\.defineProperty/,
    // Network doubles that intercept requests instead of replacing a module.
    NETWORK_DOUBLE: /\bsetupServer\s*\(|\bnock\s*\(/,
  };

  /**
   * Modules whose import means a test reaches outside its own process: the
   * filesystem, the network, a database, a broker, a process. A test that
   * imports only the code under test has nothing to mock, and the mocking
   * check must not read "any import" as "an external dependency" (#310).
   * Matched against the module specifier, whole.
   */
  static readonly EXTERNAL_CLIENT_MODULE =
    /^(?:node:)?(?:fs|fs\/promises|http|https|http2|net|tls|dgram|dns|child_process)$|^(?:axios|node-fetch|cross-fetch|got|superagent|undici|ky|pg|mysql|mysql2|mongodb|mongoose|redis|ioredis|sequelize|typeorm|knex|@prisma\/client|kafkajs|amqplib|ws|socket\.io-client|nodemailer|firebase|firebase-admin|@supabase\/supabase-js|@angular\/common\/http)$|^(?:@aws-sdk|@google-cloud|@azure)\/|^firebase\//;

  /** Module specifiers in `import … from`, side-effect imports, `import()` and `require()`. */
  private static readonly MODULE_SPECIFIER =
    /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

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
    return this.resourcesUsed(content).length > 0;
  }

  /** As UnitTestIsolationConstants.resourcesUsed, over this law's table. */
  static resourcesUsed(content: string): string[] {
    return FixtureIsolation.resourcesUsed(
      content,
      this.EXTERNAL_RESOURCE_PATTERNS
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
   * The external clients a test file imports (module specifiers, from its
   * code — an import inside a comment is not one).
   */
  static externalClientsImported(content: string): string[] {
    const code = CodeText.stripComments(content);
    const found = new Set<string>();
    for (const match of code.matchAll(this.MODULE_SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (specifier && this.EXTERNAL_CLIENT_MODULE.test(specifier)) {
        found.add(specifier);
      }
    }
    return [...found];
  }

  /**
   * Whether a test file replaces something with a test double: a mocking
   * framework, a network interceptor, or Angular's HTTP testing backend.
   */
  static hasTestDouble(content: string): boolean {
    const code = CodeText.stripComments(content);
    return (
      Object.values(this.MOCKING_PATTERNS).some(pattern =>
        PatternMatchingUtils.hasRegexPattern(code, pattern)
      ) || FixtureIsolation.replacesHttpBackend(code)
    );
  }

  /**
   * Proper mocking for one file: nothing external imported, or a double in
   * place. An import of the code under test is not an external dependency.
   */
  static hasProperMocking(content: string): boolean {
    return (
      this.externalClientsImported(content).length === 0 ||
      this.hasTestDouble(content)
    );
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
