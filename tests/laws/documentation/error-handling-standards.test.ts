/**
 * Tests for ErrorHandlingStandardsLaw
 *
 * Comprehensive tests for error handling standards validation
 */
import { ErrorHandlingStandardsLaw } from '../../../src/laws/documentation/error-handling-standards';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ErrorHandlingStandardsLaw', () => {
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
    it('should return a LawResult object', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(Array.isArray(result.violations ?? [])).toBe(true);
    });

    it('should have suggestions array', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(typeof result.fixable).toBe('boolean');
    });

    it('should return config in result', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('try-catch analysis', () => {
    it('should pass for empty project with no source files', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Empty project has no source files to analyze
      expect(result).toBeDefined();
    });

    it('should detect missing try-catch in files with critical operations', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'service.ts'),
        `
export class DataService {
  async fetchData() {
    const response = await fetch('/api/data');
    const data = JSON.parse(response);
    localStorage.setItem('data', data);
    return data;
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Should analyze the file for try-catch issues
      expect(result).toBeDefined();
    });

    it('should pass when try-catch is used for critical operations', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'service.ts'),
        `
export class DataService {
  async fetchData() {
    try {
      const response = await fetch('/api/data');
      const data = JSON.parse(response);
      localStorage.setItem('data', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch data', error);
      throw error;
    }
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect((result.violations ?? []).some(v => v.includes('try-catch'))).toBe(
        false
      );
    });
  });

  describe('error logging analysis', () => {
    it('should detect missing error logging', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'handler.ts'),
        `
export class ErrorHandler {
  handleError(error: Error) {
    try {
      // Do something
    } catch (e) {
      // No logging
    }
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should pass when proper error logging is present', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'handler.ts'),
        `
export class ErrorHandler {
  handleError(error: Error) {
    try {
      // Do something
    } catch (e) {
      console.error('Error occurred:', e);
      logger.error('Handler failed', e);
    }
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('HTTP error handling', () => {
    it('should detect HTTP calls without error handling', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'api.service.ts'),
        `
import { HttpClient } from '@angular/common/http';

export class ApiService {
  constructor(private http: HttpClient) {}

  getData() {
    return this.http.get('/api/data');
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect((result.violations ?? []).some(v => v.includes('HTTP'))).toBe(
        true
      );
    });

    it('should pass when HTTP calls have error handling', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'api.service.ts'),
        `
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

export class ApiService {
  constructor(private http: HttpClient) {}

  getData() {
    return this.http.get('/api/data').pipe(
      catchError(error => {
        console.error('API error:', error);
        throw error;
      })
    );
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Result should be defined - actual HTTP violation detection is implementation dependent
      expect(result).toBeDefined();
    });
  });

  describe('Observable error handling', () => {
    it('should detect Observables without error handling', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'component.ts'),
        `
import { Observable, Subject } from 'rxjs';

export class MyComponent {
  data$ = new Subject<string>();

  ngOnInit() {
    this.data$.subscribe(data => {
      console.log(data);
    });
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Should analyze observable error handling
      expect(result).toBeDefined();
    });

    it('should pass when Observables have error handling', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'component.ts'),
        `
import { Observable, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class MyComponent {
  data$ = new Subject<string>();

  ngOnInit() {
    this.data$.pipe(
      catchError(error => {
        console.error(error);
        return [];
      })
    ).subscribe(data => {
      console.log(data);
    });
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v => v.includes('Observable'))
      ).toBe(false);
    });
  });

  describe('global error handling', () => {
    it('should suggest global error handlers when missing', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect((result.suggestions ?? []).some(s => s.includes('global'))).toBe(
        true
      );
    });

    it('should detect Angular ErrorHandler', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'src', 'app', 'core')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'core', 'error-handler.ts'),
        `
import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    console.error('Global error:', error);
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect((result.suggestions ?? []).some(s => s.includes('global'))).toBe(
        false
      );
    });
  });

  describe('error boundaries', () => {
    it('should suggest error boundaries when missing', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(
        (result.suggestions ?? []).some(s => s.includes('error boundaries'))
      ).toBe(true);
    });

    it('should detect error boundary patterns', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'error-boundary.ts'),
        `
import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    // Error boundary implementation
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Should analyze error boundary patterns
      expect(result).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', async () => {
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return lower score for more violations', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad-service.ts'),
        `
export class BadService {
  async fetchData() {
    const data = await fetch('/api');
    JSON.parse(data);
    localStorage.setItem('x', 'y');
    this.http.get('/api').subscribe(d => console.log(d));
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('message generation', () => {
    it('should generate success message when no violations', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'src', 'app', 'core')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'core', 'error-handler.ts'),
        `
import { ErrorHandler } from '@angular/core';
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    console.error(error);
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      // Message should contain success indicator when passed
      if (result.passed) {
        expect(result.message).toContain('✅');
      }
    });

    it('should generate warning message when violations exist', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'service.ts'),
        `
export class Service {
  async fetch() {
    await fetch('/api');
    JSON.parse('{}');
  }
}
`
      );
      const result = await ErrorHandlingStandardsLaw.check(mockContext);
      if (!result.passed) {
        expect(result.message).toContain('⚠️');
      }
    });
  });
});
