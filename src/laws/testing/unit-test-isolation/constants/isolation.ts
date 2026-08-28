import { CodeText } from '../../../../utils/code-text';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { FixtureIsolation } from '../../../../utils/testing/fixture-isolation';

/**
 * Unit Test Isolation - Constants
 * Centralized configuration for test isolation analysis
 */
export class UnitTestIsolationConstants {
  /**
   * Patterns for detecting shared mutable state
   */
  /**
   * MODULE scope, which is what the names say and what the concern is.
   *
   * `^\s*` under `/m` matched at any indentation, so a declaration inside a
   * test body — the most local thing there is — counted as module state. One
   * consumer had six files flagged and not one of the matches was both at
   * module scope and mutable: a `const` array built inside a test, a `let`
   * cursor walking up the DOM in a `while` loop, a factory returning a fresh
   * fake `Document` on every call.
   *
   * Anchoring to column 0 is the whole fix for those. A declaration that is
   * indented is, by construction, inside something.
   */
  static readonly SHARED_MUTABLE_PATTERNS = {
    MODULE_LET: /^let\s+\w+(?:\s*:\s*[^=]+)?\s*=(?!.*beforeEach)/m,
    MODULE_VAR: /^var\s+\w+\s*=/m,
    MODULE_MUTABLE_OBJECT: /^const\s+\w+\s*=\s*\{/m,
    MODULE_MUTABLE_ARRAY: /^const\s+\w+\s*=\s*\[/m,
  };

  /**
   * A `const` binding at module scope leaks between tests only if something
   * WRITES to it. `const PHONE = { width: 390, height: 844 }` is a viewport
   * constant — and extracting those two numbers into a named constant is what
   * `magic-number-prevention` asks for in the same audit, so reporting it here
   * asked the project to do the opposite of what its neighbour required.
   */
  static isMutated(content: string, declaration: string): boolean {
    const name = /^(?:const|let|var)\s+(\w+)/.exec(declaration)?.[1];
    if (!name) return false;

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `\\b${escaped}\\s*(?:=[^=]|\\.\\w+\\s*=[^=]|\\[[^\\]]*\\]\\s*=[^=]|\\.(?:push|pop|shift|unshift|splice|sort|reverse|fill|set|delete|add|clear)\\s*\\()`,
      'm'
    ).test(content.replace(declaration, ''));
  }

  /**
   * Patterns for test isolation indicators
   */
  static readonly ISOLATION_SETUP_PATTERNS = {
    BEFORE_EACH: /beforeEach\s*\(/,
    AFTER_EACH: /afterEach\s*\(/,
    TESTBED_RESET: /TestBed\.resetTestingModule/,
    MOCK_CLEAR: /\.mockClear\(\)/,
    MOCK_RESET: /\.mockReset\(\)/,
    MOCK_RESTORE: /\.mockRestore\(\)/,
  };

  /**
   * Patterns for test order dependencies
   */
  static readonly ORDER_DEPENDENCY_PATTERNS = {
    SKIP_TEST: /it\.skip/,
    ONLY_TEST: /it\.only/,
    SKIP_TEST_JASMINE: /xit\(/,
    FOCUSED_TEST: /fit\(/,
    SKIP_SUITE: /describe\.skip/,
    ONLY_SUITE: /describe\.only/,
    FOCUSED_SUITE: /fdescribe\(/,
    SKIP_SUITE_JASMINE: /xdescribe\(/,
  };

  /**
   * Patterns for external resources
   */
  static readonly EXTERNAL_RESOURCE_PATTERNS = {
    HTTP_CLIENT: /HttpClient|http\./i,
    STORAGE: /localStorage|sessionStorage/,
    DATABASE: /database|db\./i,
    FETCH: /fetch\(/,
    XML_HTTP: /XMLHttpRequest/,
    WEBSOCKET: /WebSocket/,
    FILE_READER: /FileReader/,
  };

  /**
   * Patterns for resource cleanup
   */
  static readonly CLEANUP_PATTERNS = {
    CLEAR_IN_AFTER: /afterEach.*\.clear/,
    RESET_IN_AFTER: /afterEach.*\.reset/,
    RESTORE_IN_AFTER: /afterEach.*\.restore/,
    UNSUBSCRIBE: /\.unsubscribe\(\)/,
    COMPLETE: /\.complete\(\)/,
    DISCONNECT: /\.disconnect\(\)/,
    CLOSE: /\.close\(\)/,
  };

  /**
   * Patterns for global state modifications
   */
  static readonly GLOBAL_STATE_PATTERNS = {
    WINDOW_MODIFY: /window\.\w+\s*=/,
    GLOBAL_MODIFY: /global\.\w+\s*=/,
    ENV_MODIFY: /process\.env\.\w+\s*=/,
    DOCUMENT_MODIFY: /document\.\w+\s*=/,
    WINDOW_PROPERTY: /Object\.defineProperty.*window/,
    GLOBAL_PROPERTY: /Object\.defineProperty.*global/,
  };

  /**
   * Patterns for test framework isolation features
   */
  static readonly FRAMEWORK_ISOLATION_PATTERNS = {
    DESCRIBE: /describe\(/,
    CONTEXT: /context\(/,
    SUITE: /suite\(/,
    TESTBED: /TestBed/,
    JEST_ISOLATE: /jest\.isolateModules/,
    JASMINE_SPY: /jasmine\.createSpy/,
    SINON: /sinon\./,
    TEST_DOUBLE: /testDouble\./,
  };

  /**
   * Isolation thresholds
   */
  static readonly ISOLATION_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 80,
    ACCEPTABLE: 70,
    POOR: 50,
    CRITICAL: 20,
  };

  /**
   * Check if content has shared mutable state
   */
  static hasSharedMutableState(content: string): boolean {
    // Comments describe code; they are not code. Stripped for the same reason
    // the magic-number analyzer strips them.
    const code = CodeText.stripComments(content);

    // `let`/`var` at module scope is shared mutable state by declaration.
    const declared = [
      this.SHARED_MUTABLE_PATTERNS.MODULE_LET,
      this.SHARED_MUTABLE_PATTERNS.MODULE_VAR,
    ].some(pattern => PatternMatchingUtils.hasRegexPattern(code, pattern));
    if (declared) return true;

    // A module-scope `const` object or array is shared state only if something
    // WRITES to it. An immutable binding that is never mutated cannot leak
    // between tests.
    // EVERY such declaration is examined, not just the first one found: a file
    // whose first constant is frozen and whose second is pushed to is not
    // isolated, and stopping at the first match would call it isolated.
    for (const pattern of [
      this.SHARED_MUTABLE_PATTERNS.MODULE_MUTABLE_OBJECT,
      this.SHARED_MUTABLE_PATTERNS.MODULE_MUTABLE_ARRAY,
    ]) {
      const all = new RegExp(pattern.source, 'gm');
      for (const match of code.matchAll(all)) {
        if (this.isMutated(code, match[0])) return true;
      }
    }

    return false;
  }

  /**
   * Check if content has proper isolation setup
   */
  static hasProperSetupTeardown(content: string): boolean {
    const hasTests = content.includes('it(') || content.includes('test(');
    if (!hasTests) return true;

    // A Playwright spec's isolation is the FIXTURE, not a hook. Every
    // `test('…', async ({ page }) => …)` gets a fresh BrowserContext and Page —
    // that is stronger isolation than a `beforeEach`, not the absence of it.
    //
    // Demanding a hook here asked for empty `beforeEach` blocks whose only
    // purpose is to reach a percentage: ceremony that changes nothing about
    // whether the tests are isolated, which is the edit this whole rule set
    // exists to argue against.
    if (FixtureIsolation.isFixtureIsolated(content)) return true;

    const setupPatterns = [
      this.ISOLATION_SETUP_PATTERNS.BEFORE_EACH,
      this.ISOLATION_SETUP_PATTERNS.AFTER_EACH,
      this.ISOLATION_SETUP_PATTERNS.TESTBED_RESET,
      this.ISOLATION_SETUP_PATTERNS.MOCK_CLEAR,
      this.ISOLATION_SETUP_PATTERNS.MOCK_RESET,
      this.ISOLATION_SETUP_PATTERNS.MOCK_RESTORE,
    ];

    return setupPatterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has test order dependencies
   */
  static hasTestOrderDependencies(content: string): boolean {
    const patterns = [
      this.ORDER_DEPENDENCY_PATTERNS.SKIP_TEST,
      this.ORDER_DEPENDENCY_PATTERNS.ONLY_TEST,
      this.ORDER_DEPENDENCY_PATTERNS.SKIP_TEST_JASMINE,
      this.ORDER_DEPENDENCY_PATTERNS.FOCUSED_TEST,
      this.ORDER_DEPENDENCY_PATTERNS.SKIP_SUITE,
      this.ORDER_DEPENDENCY_PATTERNS.ONLY_SUITE,
      this.ORDER_DEPENDENCY_PATTERNS.FOCUSED_SUITE,
      this.ORDER_DEPENDENCY_PATTERNS.SKIP_SUITE_JASMINE,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content uses external resources
   */
  static usesExternalResources(content: string): boolean {
    // A comment that DESCRIBES a resource is not a test that uses one. The
    // single match in one consumer's file was a line of prose inside a block
    // comment, explaining why a test had been deleted.
    content = CodeText.stripComments(content);
    const patterns = [
      this.EXTERNAL_RESOURCE_PATTERNS.HTTP_CLIENT,
      this.EXTERNAL_RESOURCE_PATTERNS.STORAGE,
      this.EXTERNAL_RESOURCE_PATTERNS.DATABASE,
      this.EXTERNAL_RESOURCE_PATTERNS.FETCH,
      this.EXTERNAL_RESOURCE_PATTERNS.XML_HTTP,
      this.EXTERNAL_RESOURCE_PATTERNS.WEBSOCKET,
      this.EXTERNAL_RESOURCE_PATTERNS.FILE_READER,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has proper resource cleanup
   */
  static hasResourceCleanup(content: string): boolean {
    const patterns = [
      this.CLEANUP_PATTERNS.CLEAR_IN_AFTER,
      this.CLEANUP_PATTERNS.RESET_IN_AFTER,
      this.CLEANUP_PATTERNS.RESTORE_IN_AFTER,
      this.CLEANUP_PATTERNS.UNSUBSCRIBE,
      this.CLEANUP_PATTERNS.COMPLETE,
      this.CLEANUP_PATTERNS.DISCONNECT,
      this.CLEANUP_PATTERNS.CLOSE,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content modifies global state
   */
  static modifiesGlobalState(content: string): boolean {
    const patterns = [
      this.GLOBAL_STATE_PATTERNS.WINDOW_MODIFY,
      this.GLOBAL_STATE_PATTERNS.GLOBAL_MODIFY,
      this.GLOBAL_STATE_PATTERNS.ENV_MODIFY,
      this.GLOBAL_STATE_PATTERNS.DOCUMENT_MODIFY,
      this.GLOBAL_STATE_PATTERNS.WINDOW_PROPERTY,
      this.GLOBAL_STATE_PATTERNS.GLOBAL_PROPERTY,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content uses framework isolation patterns
   */
  static usesFrameworkIsolationPatterns(content: string): boolean {
    const patterns = [
      this.FRAMEWORK_ISOLATION_PATTERNS.DESCRIBE,
      this.FRAMEWORK_ISOLATION_PATTERNS.CONTEXT,
      this.FRAMEWORK_ISOLATION_PATTERNS.SUITE,
      this.FRAMEWORK_ISOLATION_PATTERNS.TESTBED,
      this.FRAMEWORK_ISOLATION_PATTERNS.JEST_ISOLATE,
      this.FRAMEWORK_ISOLATION_PATTERNS.JASMINE_SPY,
      this.FRAMEWORK_ISOLATION_PATTERNS.SINON,
      this.FRAMEWORK_ISOLATION_PATTERNS.TEST_DOUBLE,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Get isolation level based on score
   */
  static getIsolationLevel(score: number): string {
    if (score >= this.ISOLATION_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (score >= this.ISOLATION_THRESHOLDS.GOOD) return 'GOOD';
    if (score >= this.ISOLATION_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
    if (score >= this.ISOLATION_THRESHOLDS.POOR) return 'POOR';
    return 'CRITICAL';
  }
}
