/**
 * @fileoverview Tests for ngrx-error-handling-configuration.ts
 * @description Tests for NgRx error handling configuration utilities
 */

import { NgRxErrorHandlingConfiguration } from '../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/ngrx-error-handling/ngrx-error-handling-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-error-handling-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('ERROR_HANDLING_KEYWORDS', () => {
    it('should have CATCH_ERROR', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.CATCH_ERROR
      ).toBeDefined();
    });

    it('should have RX_OF', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.RX_OF
      ).toBeDefined();
    });

    it('should have TIMEOUT', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.TIMEOUT
      ).toBeDefined();
    });

    it('should have HTTP_LOWERCASE', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.HTTP_LOWERCASE
      ).toBeDefined();
    });

    it('should have RETRY', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.RETRY
      ).toBeDefined();
    });

    it('should have RETRY_WHEN', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.RETRY_WHEN
      ).toBeDefined();
    });

    it('should have HTTP', () => {
      expect(
        NgRxErrorHandlingConfiguration.ERROR_HANDLING_KEYWORDS.HTTP
      ).toBeDefined();
    });
  });

  describe('EFFECTS_FILE_PATTERNS', () => {
    it('should have EFFECTS_DOT', () => {
      expect(
        NgRxErrorHandlingConfiguration.EFFECTS_FILE_PATTERNS.EFFECTS_DOT
      ).toBe('.effects.');
    });

    it('should have EFFECT_DOT', () => {
      expect(
        NgRxErrorHandlingConfiguration.EFFECTS_FILE_PATTERNS.EFFECT_DOT
      ).toBe('.effect.');
    });

    it('should have EFFECTS_PREFIX', () => {
      expect(
        NgRxErrorHandlingConfiguration.EFFECTS_FILE_PATTERNS.EFFECTS_PREFIX
      ).toBe('effects.');
    });

    it('should have EFFECT_KEYWORD', () => {
      expect(
        NgRxErrorHandlingConfiguration.EFFECTS_FILE_PATTERNS.EFFECT_KEYWORD
      ).toBe('effect');
    });

    it('should have TYPESCRIPT_EXTENSION', () => {
      expect(
        NgRxErrorHandlingConfiguration.EFFECTS_FILE_PATTERNS
          .TYPESCRIPT_EXTENSION
      ).toBe('.ts');
    });
  });

  describe('VALIDATION_MESSAGES_CONFIG', () => {
    it('should have MISSING_CATCH_ERROR_VIOLATION with placeholder', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_CATCH_ERROR_VIOLATION
      ).toContain('{0}');
    });

    it('should have MISSING_CATCH_ERROR_SUGGESTION', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_CATCH_ERROR_SUGGESTION
      ).toContain('catchError');
    });

    it('should have MISSING_OBSERVABLE_RETURN_VIOLATION with placeholder', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_OBSERVABLE_RETURN_VIOLATION
      ).toContain('{0}');
    });

    it('should have MISSING_OBSERVABLE_RETURN_SUGGESTION', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_OBSERVABLE_RETURN_SUGGESTION
      ).toContain('error action');
    });

    it('should have RETRY_LOGIC_SUGGESTION', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .RETRY_LOGIC_SUGGESTION
      ).toContain('retry');
    });

    it('should have TIMEOUT_SUGGESTION', () => {
      expect(
        NgRxErrorHandlingConfiguration.VALIDATION_MESSAGES_CONFIG
          .TIMEOUT_SUGGESTION
      ).toContain('timeout');
    });
  });

  describe('buildMessage', () => {
    it('should replace single placeholder', () => {
      const result = NgRxErrorHandlingConfiguration.buildMessage(
        'Error in {0}',
        'test.effects.ts'
      );
      expect(result).toBe('Error in test.effects.ts');
    });

    it('should replace multiple placeholders', () => {
      const result = NgRxErrorHandlingConfiguration.buildMessage(
        '{0} has issue in {1}',
        'catchError',
        'test.effects.ts'
      );
      expect(result).toBe('catchError has issue in test.effects.ts');
    });

    it('should handle message without placeholders', () => {
      const result =
        NgRxErrorHandlingConfiguration.buildMessage('Add error handling');
      expect(result).toBe('Add error handling');
    });
  });

  describe('getValidationMessages', () => {
    it('should return validation message functions', () => {
      const messages = NgRxErrorHandlingConfiguration.getValidationMessages();

      expect(typeof messages.MISSING_CATCH_ERROR_VIOLATION).toBe('function');
      expect(typeof messages.MISSING_OBSERVABLE_RETURN_VIOLATION).toBe(
        'function'
      );
      expect(typeof messages.MISSING_CATCH_ERROR_SUGGESTION).toBe('string');
      expect(typeof messages.MISSING_OBSERVABLE_RETURN_SUGGESTION).toBe(
        'string'
      );
      expect(typeof messages.RETRY_LOGIC_SUGGESTION).toBe('string');
      expect(typeof messages.TIMEOUT_SUGGESTION).toBe('string');
    });

    it('should build MISSING_CATCH_ERROR_VIOLATION message', () => {
      const messages = NgRxErrorHandlingConfiguration.getValidationMessages();
      const result = messages.MISSING_CATCH_ERROR_VIOLATION('test.effects.ts');

      expect(result).toContain('test.effects.ts');
      expect(result).toContain('catchError');
    });

    it('should build MISSING_OBSERVABLE_RETURN_VIOLATION message', () => {
      const messages = NgRxErrorHandlingConfiguration.getValidationMessages();
      const result =
        messages.MISSING_OBSERVABLE_RETURN_VIOLATION('test.effects.ts');

      expect(result).toContain('test.effects.ts');
    });
  });

  describe('analyzeErrorHandlingPatterns', () => {
    it('should detect catchError', () => {
      const content = `
        catchError(error => of(loadItemsFailure({ error })))
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasCatchError).toBe(true);
    });

    it('should detect of operator', () => {
      const content = `
        of(loadItemsFailure({ error }))
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasRxOf).toBe(true);
    });

    it('should detect HTTP content', () => {
      const content = `
        this.http.get('/api/items')
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasHttpContent).toBe(true);
    });

    it('should detect retry logic', () => {
      const content = `
        retry(3)
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasRetryLogic).toBe(true);
    });

    it('should detect retryWhen', () => {
      const content = `
        retryWhen(errors => errors.pipe(delay(1000)))
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasRetryLogic).toBe(true);
    });

    it('should detect timeout', () => {
      const content = `
        timeout(5000)
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasTimeout).toBe(true);
    });

    it('should analyze complete error handling', () => {
      const content = `
        this.http.get('/api/items').pipe(
          timeout(5000),
          retry(3),
          catchError(error => of(loadItemsFailure({ error })))
        )
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasCatchError).toBe(true);
      expect(result.hasRxOf).toBe(true);
      expect(result.hasHttpContent).toBe(true);
      expect(result.hasRetryLogic).toBe(true);
      expect(result.hasTimeout).toBe(true);
    });

    it('should return false for content without error handling', () => {
      const content = `
        map(items => loadItemsSuccess({ items }))
      `;
      const result =
        NgRxErrorHandlingConfiguration.analyzeErrorHandlingPatterns(content);

      expect(result.hasCatchError).toBe(false);
      expect(result.hasRxOf).toBe(false);
      expect(result.hasRetryLogic).toBe(false);
      expect(result.hasTimeout).toBe(false);
    });
  });

  describe('hasHttpContent', () => {
    it('should return true for http lowercase', () => {
      expect(
        NgRxErrorHandlingConfiguration.hasHttpContent('this.http.get()')
      ).toBe(true);
    });

    it('should return true for Http uppercase', () => {
      expect(NgRxErrorHandlingConfiguration.hasHttpContent('HttpClient')).toBe(
        true
      );
    });

    it('should return false for no HTTP', () => {
      expect(
        NgRxErrorHandlingConfiguration.hasHttpContent('this.service.getData()')
      ).toBe(false);
    });
  });

  describe('hasRetryLogic', () => {
    it('should return true for retry', () => {
      expect(NgRxErrorHandlingConfiguration.hasRetryLogic('retry(3)')).toBe(
        true
      );
    });

    it('should return true for retryWhen', () => {
      expect(
        NgRxErrorHandlingConfiguration.hasRetryLogic('retryWhen(errors => {})')
      ).toBe(true);
    });

    it('should return false for no retry', () => {
      expect(
        NgRxErrorHandlingConfiguration.hasRetryLogic('catchError(e => of(e))')
      ).toBe(false);
    });
  });

  describe('isEffectsFile', () => {
    it('should return true for .effects.ts files', () => {
      expect(
        NgRxErrorHandlingConfiguration.isEffectsFile('items.effects.ts')
      ).toBe(true);
    });

    it('should return true for .effect.ts files', () => {
      expect(
        NgRxErrorHandlingConfiguration.isEffectsFile('items.effect.ts')
      ).toBe(true);
    });

    it('should return true for effects. prefix files', () => {
      expect(
        NgRxErrorHandlingConfiguration.isEffectsFile('effects.items.ts')
      ).toBe(true);
    });

    it('should return false for reducer files', () => {
      expect(
        NgRxErrorHandlingConfiguration.isEffectsFile('items.reducer.ts')
      ).toBe(false);
    });

    it('should return false for actions files', () => {
      expect(
        NgRxErrorHandlingConfiguration.isEffectsFile('items.actions.ts')
      ).toBe(false);
    });
  });
});
