/**
 * @fileoverview Tests for ngrx-action-handling-analyzer.ts
 * @description Tests for NgRx Action Handling Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxActionHandlingAnalyzer } from '../../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-analyzer';
import { NgRxActionHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-action-handling/ngrx-action-handling-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxActionHandlingAnalyzer', () => {
    describe('checkActionHandling', () => {
      it('should delegate to NgRxActionHandlingValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxActionHandlingValidationPatterns,
          'validateAllActionHandlingPatterns'
        );
        const existsSpy = jest.spyOn(FileUtils, 'exists');

        existsSpy.mockReturnValue(false);
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty results when no reducer files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should analyze reducer files for action handling patterns', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/state/counter.reducer.ts',
        ]);
        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const counterReducer = createReducer(
            initialState,
            on(increment, state => ({ ...state, count: state.count + 1 }))
          );
        `);
        basenameSpy.mockReturnValue('counter.reducer.ts');

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should detect violations in reducer without action handlers', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/state/empty.reducer.ts',
        ]);
        readFileSpy.mockReturnValue(`
          import { createReducer } from '@ngrx/store';
          export const emptyReducer = createReducer(initialState);
        `);
        basenameSpy.mockReturnValue('empty.reducer.ts');

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('action handlers'))).toBe(
          true
        );
      });

      it('should process multiple reducer files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/state/counter.reducer.ts',
          '/test/project/src/state/user.reducer.ts',
        ]);
        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(action, state => ({ ...state }))
          );
        `);
        basenameSpy.mockImplementation(path => path.split('/').pop() ?? '');

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should handle empty reducer file content', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/state/empty.reducer.ts',
        ]);
        readFileSpy.mockReturnValue('');
        basenameSpy.mockReturnValue('empty.reducer.ts');

        const result = NgRxActionHandlingAnalyzer.checkActionHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });
  });
});
