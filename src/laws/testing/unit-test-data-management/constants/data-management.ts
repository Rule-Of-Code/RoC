import { CodeText } from '../../../../utils/code-text';
import { PathOperations } from '../../../../utils/path-operations';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { loadTypeScript } from '../../../../utils/react/tsx-source';
import {
  matchesFromCode,
  readCodeView,
} from '../../../../utils/security/code-view';
import { ExternalBoundary } from '../../../../utils/testing/external-boundary';
import { FixtureIsolation } from '../../../../utils/testing/fixture-isolation';
import { ModuleBindings } from '../../../../utils/testing/module-bindings';

/** Points the data management level score loses per problem. */
const PENALTY = { noSetup: 30, hardcodedData: 25, sharedState: 25 } as const;

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

  // Data a test feeds in, not the value it expects back. An exact expected
  // value in an assertion — `expect(r.lawName).toBe('angular-testing-
  // excellence')` — is the assertion itself; a factory cannot produce what
  // the code under test must return. A pattern that read every long string
  // in `toBe(…)` as "hardcoded test data" (LONG_STRING_ASSERTION) is gone.
  static readonly HARDCODED_DATA_PATTERNS = {
    HARDCODED_ID_ARRAY:
      /const\s+\w+\s*=\s*\[\s*\{[^}]*id:\s*['"]\d+['"][^}]*\}/,
    MOCK_WITH_NUMBER: /\.mockReturnValue\(\s*\d{4,}\s*\)/,
  };

  // ============================================
  // 4. Shared State Patterns
  // ============================================

  static readonly SHARED_STATE_PATTERNS = {
    // Only MODULE-scope (column 0) mutable bindings are genuine cross-test shared
    // state. An INDENTED `let x = ...` is a normal local inside a describe / test /
    // helper (e.g. `let result = reducer(...)`) and must NOT be flagged.
    // ModuleBindings' patterns, shared with Test Isolation Enforcement
    // (#552); a binding reset in beforeEach/afterEach is not shared.
    MODULE_LET: ModuleBindings.MODULE_LET,
    MODULE_VAR: ModuleBindings.MODULE_VAR,
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
    DATABASE:
      /\bdb\.\w+\s*\(|\.connect\s*\(|\bcreateConnection\s*\(|\bcreatePool\s*\(|\bnew\s+(?:Pool|PrismaClient|Sequelize)\s*\(|\bknex\s*\(/,
    STORAGE: /localStorage|sessionStorage/,
    FILE_HANDLE: /createReadStream|createWriteStream|fs\.open\(/,
    WEBSOCKET:
      /\bnew\s+WebSocket\s*\(|\bio\s*\(|\bsocket\.(?:emit|on|send|connect)\s*\(/,
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

  /** ExternalBoundary's framework doubles, shared with Unit Test Quality (#491). */
  static readonly MOCKING_PATTERNS = ExternalBoundary.FRAMEWORK_DOUBLES;

  /**
   * Modules whose import means a test reaches outside its own process: a
   * network or a shared service. A test that imports only the code under
   * test has nothing to mock, and the mocking check must not read "any
   * import" as "an external dependency" (#310). The filesystem and a child
   * process are not on it (#491): ExternalBoundary, the definition Unit Test
   * Quality reads too. Matched against the module specifier, whole.
   */
  static readonly EXTERNAL_CLIENT_MODULE = ExternalBoundary.CLIENT_MODULE;

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
   * Check if content has hardcoded test data.
   *
   * A pattern counts where it starts in code (#426): `const users = [{ id:
   * '1' }]` written inside a fixture string — a detector's own test keeps
   * its inputs that way — is text, not data the test uses. The law runs
   * only with the parser (it reports the files as not read without one);
   * a direct caller without it gets the raw-text answer.
   */
  static hasHardcodedTestData(content: string, fileName = 'file.ts'): boolean {
    const patterns = Object.values(this.HARDCODED_DATA_PATTERNS);
    const ts = loadTypeScript(PathOperations.getDirectory(fileName));
    if (!ts)
      return patterns.some(pattern =>
        PatternMatchingUtils.hasRegexPattern(content, pattern)
      );
    const view = readCodeView(ts, content, fileName);
    return patterns.some(pattern => matchesFromCode(view, pattern));
  }

  /**
   * Whether the CODE of a test file shares mutable state. Comments and the
   * contents of strings and templates are not code: a note saying why a
   * `window.x =` was removed, or a fixture string holding `window.x = 1`
   * that a detector's test hands in, is not the assignment (#513). Read
   * with the parser (CodeText.codeOnly), as Test Isolation Enforcement reads
   * its patterns; the law reports its files as not read without one (#427).
   */
  static hasSharedMutableState(
    content: string,
    fileName?: string,
    projectRoot?: string
  ): boolean {
    const patterns = Object.values(this.SHARED_STATE_PATTERNS);
    // Parse only a file whose text could hold a match at all.
    if (!patterns.some(pattern => pattern.test(content))) return false;
    const code = CodeText.codeOnly(content, fileName, projectRoot);
    return (
      ModuleBindings.hasShared(code, projectRoot) ||
      [
        this.SHARED_STATE_PATTERNS.WINDOW_ASSIGNMENT,
        this.SHARED_STATE_PATTERNS.GLOBAL_ASSIGNMENT,
      ].some(pattern => PatternMatchingUtils.hasRegexPattern(code, pattern))
    );
  }

  /**
   * Check if content uses external resources
   */
  static usesExternalResources(content: string): boolean {
    return this.resourcesUsed(content).length > 0;
  }

  /** As UnitTestIsolationConstants.resourcesUsed, over this law's table. */
  static resourcesUsed(content: string, fileName?: string): string[] {
    return FixtureIsolation.resourcesUsed(
      content,
      this.EXTERNAL_RESOURCE_PATTERNS,
      fileName
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
   * What a test file reaches across the boundary: the clients it imports,
   * or `an HTTP call` when its own code makes a request with no import to
   * name it (a global `fetch(`), which Unit Test Quality reports as an
   * unmocked HTTP call. Read from the code: a request inside a fixture
   * string is the input of a test, not a request it makes.
   */
  static boundaryReached(
    content: string,
    fileName?: string,
    projectRoot?: string
  ): string[] {
    const clients = this.externalClientsImported(content);
    if (clients.length > 0 || !ExternalBoundary.HTTP_CALL.test(content)) {
      return clients;
    }
    const code = CodeText.codeOnly(content, fileName, projectRoot);
    return ExternalBoundary.HTTP_CALL.test(code) ? ['an HTTP call'] : [];
  }

  /**
   * Whether a test file replaces something with a test double: a mocking
   * framework, a network interceptor, Angular's HTTP testing backend, or a
   * double named by its role (#29). ExternalBoundary's definition, the one
   * Unit Test Quality reads (#491).
   */
  static hasTestDouble(content: string): boolean {
    return ExternalBoundary.hasTestDouble(CodeText.stripComments(content));
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
    if (!hasSetup) score -= PENALTY.noSetup;
    if (hasHardcoded) score -= PENALTY.hardcodedData;
    if (hasSharedState) score -= PENALTY.sharedState;

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
