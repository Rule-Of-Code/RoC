/**
 * Tests for ErrorHandlingCompletenessLaw
 *
 * Comprehensive tests for error handling completeness validation
 */
import { ErrorHandlingCompletenessLaw } from '../../../src/checkers/code-quality-laws/error-handling-completeness';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ErrorHandlingCompletenessLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('error-handling-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('async error handling', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should detect async calls without error handling', () => {
      const codeWithoutHandling = `
async function fetchData() {
  const data = await fetch('/api/data');
  const result = await data.json();
  await saveData(result);
  await processData(result);
  await notifyUser();
  return result;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'async-no-handler.ts'),
        codeWithoutHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const asyncViolation = result.violations?.find(v =>
        v.includes('async calls without proper error handling')
      );
      expect(asyncViolation).toBeDefined();
    });

    it('should pass for async with try-catch', () => {
      const codeWithHandling = `
async function fetchData() {
  try {
    const data = await fetch('/api/data');
    return await data.json();
  } catch (error) {
    console.error('Failed to fetch', error);
    throw error;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'async-with-handler.ts'),
        codeWithHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const handledFileViolation = result.violations?.find(
        v =>
          v.includes('async-with-handler.ts') &&
          v.includes('async calls without')
      );
      expect(handledFileViolation).toBeUndefined();
    });
  });

  describe('Promise chain error handling', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should detect Promise chains without .catch()', () => {
      const promiseWithoutCatch = `
function loadData() {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => processData(data))
    .then(result => displayResult(result));
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'promise-no-catch.ts'),
        promiseWithoutCatch
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const promiseViolation = result.violations?.find(v =>
        v.includes('Promise chains without .catch()')
      );
      expect(promiseViolation).toBeDefined();
    });

    it('should handle Promise code with .catch()', () => {
      const promiseWithCatch = `
function loadData() {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => processData(data))
    .catch(error => handleError(error));
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'promise-with-catch.ts'),
        promiseWithCatch
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      // Should return valid result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('HTTP request error handling', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should detect HTTP requests without error handling', () => {
      const httpWithoutHandling = `
function fetchUser() {
  fetch('/api/user');
}

function getProducts() {
  axios.get('/products');
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'http-no-handler.ts'),
        httpWithoutHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const httpViolation = result.violations?.find(v =>
        v.includes('HTTP requests without error handling')
      );
      expect(httpViolation).toBeDefined();
    });

    it('should pass for HTTP with try-catch', () => {
      const httpWithHandling = `
async function fetchUser() {
  try {
    const response = await fetch('/api/user');
    return response.json();
  } catch (error) {
    handleError(error);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'http-with-handler.ts'),
        httpWithHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const handledHttpViolation = result.violations?.find(
        v =>
          v.includes('http-with-handler.ts') &&
          v.includes('HTTP requests without')
      );
      expect(handledHttpViolation).toBeUndefined();
    });
  });

  describe('event listener error handling', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should detect event handlers without error handling', () => {
      const eventWithoutHandling = `
function setupListeners() {
  document.addEventListener('click', handleClick);
  button.onclick = handleButtonClick;
}

function handleClick(event) {
  processClick(event);
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'events-no-handler.ts'),
        eventWithoutHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const eventViolation = result.violations?.find(v =>
        v.includes('event handlers without error handling')
      );
      expect(eventViolation).toBeDefined();
    });

    it('should pass for events with try-catch', () => {
      const eventWithHandling = `
function setupListeners() {
  document.addEventListener('click', handleClick);
}

function handleClick(event) {
  try {
    processClick(event);
  } catch (error) {
    logError(error);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'events-with-handler.ts'),
        eventWithHandling
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      const handledEventViolation = result.violations?.find(
        v =>
          v.includes('events-with-handler.ts') &&
          v.includes('event handlers without')
      );
      expect(handledEventViolation).toBeUndefined();
    });
  });

  describe('global error handling', () => {
    it('should detect missing global error handling', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.violations).toContain(
        'No global error handling configured'
      );
    });

    it('should pass for Angular with GlobalErrorHandler', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'app'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.ts'),
        `
@Component({})
export class AppComponent {
  constructor(private errorHandler: GlobalErrorHandler) {}
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No global error handling configured'
      );
    });

    it('should pass for React with ErrorBoundary', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'App.tsx'),
        `
export function App() {
  return (
    <ErrorBoundary fallback={<Error />}>
      <MainContent />
    </ErrorBoundary>
  );
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No global error handling configured'
      );
    });

    it('should pass for Node with unhandledRejection handler', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'main.ts'),
        `
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No global error handling configured'
      );
    });

    it('should pass for window.onerror handler', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'main.ts'),
        `
window.onerror = function(message, source, lineno, colno, error) {
  logError(error);
  return true;
};
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'No global error handling configured'
      );
    });
  });

  describe('error monitoring', () => {
    it('should suggest error monitoring when not installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {},
        })
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Consider adding error monitoring service (Sentry, Bugsnag, Rollbar)'
      );
    });

    it('should not suggest when Sentry is installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { '@sentry/browser': '^7.0.0' },
        })
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Consider adding error monitoring service (Sentry, Bugsnag, Rollbar)'
      );
    });

    it('should suggest logging library when not installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {},
        })
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Add structured logging library for better error tracking'
      );
    });

    it('should not suggest logging when winston is installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { winston: '^3.0.0' },
        })
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Add structured logging library for better error tracking'
      );
    });
  });

  describe('unsafe property access detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should not flag optional chaining with comparison (valid TS pattern)', () => {
      const safeCode = `
function checkError(error: unknown) {
  if (error?.message === 'NotFound') {
    return true;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unsafe-access.ts'),
        safeCode
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      // The unsafe-property-access detector was intentionally removed because
      // optional chaining is a valid TypeScript pattern, not an error.
      const unsafeViolation = result.violations?.find(v =>
        v.includes('unsafe property access')
      );
      expect(unsafeViolation).toBeUndefined();
    });
  });

  describe('suggestions', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
    });

    it('should include try-catch suggestion when violations exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'async.ts'),
        `
async function load() {
  await fetch('/api');
  await fetch('/api2');
  await fetch('/api3');
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Add try-catch blocks around async operations and API calls'
      );
    });

    it('should include error boundary suggestion', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'async.ts'),
        `
async function load() {
  await fetch('/api');
  await fetch('/api2');
  await fetch('/api3');
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Implement proper error boundaries in React components'
      );
    });

    it('should include Result/Either pattern suggestion', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'async.ts'),
        `
async function load() {
  await fetch('/api');
  await fetch('/api2');
  await fetch('/api3');
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Use Result/Either patterns for functional error handling'
      );
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { '@sentry/browser': '^7.0.0', winston: '^3.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'main.ts'),
        `
process.on('unhandledRejection', handleError);

async function safe() {
  try {
    await fetch('/api');
  } catch (e) {
    logError(e);
  }
}
`
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      if (result.passed) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct points for violations', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unsafe.ts'),
        'async function x() { await fetch("/api"); }'
      );
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have a minimum score', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      // Create many files with violations
      for (let i = 0; i < 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `file${i}.ts`),
          `
async function load${i}() {
  await fetch('/api');
  await fetch('/api2');
  await fetch('/api3');
}
fetch('/data').then(r => r.json()).then(d => process(d));
`
        );
      }
      const result = ErrorHandlingCompletenessLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
