/**
 * @fileoverview Tests for ngrx-immutability-validation-patterns.ts
 * @description Tests for NgRx Immutability Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxImmutabilityConfiguration } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-configuration';
import { NgRxImmutabilityValidationPatterns } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxImmutabilityValidationPatterns', () => {
    describe('validateAllImmutabilityPatterns', () => {
      it('should return empty violations when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty violations when no reducer files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect direct state mutation violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/test.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('state.name = "test"');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(v => v.includes('Direct state mutation'))
        ).toBe(true);
        expect(
          result.suggestions.some(s => s.includes('immutable update'))
        ).toBe(true);
      });

      it('should detect nested object mutation violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/user.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('state.user.name = "test"');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(v => v.includes('Nested object mutation'))
        ).toBe(true);
        expect(result.suggestions.some(s => s.includes('nested spread'))).toBe(
          true
        );
      });

      it('should detect array mutation violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/items.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('state.items.push(item)');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('items.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('Array mutation'))).toBe(
          true
        );
        expect(
          result.suggestions.some(s => s.includes('immutable array methods'))
        ).toBe(true);
      });

      it('should detect Object.assign mutation violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/state.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('Object.assign(state, { name: "test" })');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('state.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('Object.assign'))).toBe(
          true
        );
      });

      it('should suggest spread operator usage', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/test.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('on(action, (state) => { return state });');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.some(s => s.includes('spread operator'))
        ).toBe(true);
      });

      it('should suggest immer import when produce is used', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/test.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(
          'produce(state, draft => { draft.name = "test"; })'
        );

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('immer'))).toBe(true);
      });

      it('should skip files with empty content', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/empty.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should analyze multiple reducer files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/project/src/user.reducer.ts',
          '/test/project/src/items.reducer.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy
          .mockReturnValueOnce('state.name = "test"')
          .mockReturnValueOnce('state.items.push(item)');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy
          .mockReturnValueOnce('user.reducer.ts')
          .mockReturnValueOnce('items.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThanOrEqual(2);
      });

      it('should return no violations for compliant reducers', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/project/src/good.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          on(loadSuccess, (state, { items }) => ({
            ...state,
            items: [...items],
            loading: false
          }))
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('good.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
      });
    });

    describe('analyzeReducerFileComprehensive', () => {
      it('should return violations and suggestions for a reducer file', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('state.name = "test"');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            '/test/project/src/test.reducer.ts'
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should return empty arrays for compliant reducer file', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          on(loadSuccess, (state, { items }) => ({
            ...state,
            items: [...items],
            loading: false
          }))
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('compliant.reducer.ts');

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            '/test/project/src/compliant.reducer.ts'
          );

        expect(result.violations).toHaveLength(0);
      });

      it('should handle empty file content', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            '/test/project/src/empty.reducer.ts'
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('buildMessage integration', () => {
      it('should use buildMessage from configuration', () => {
        const message = NgRxImmutabilityConfiguration.buildMessage(
          NgRxImmutabilityConfiguration.VALIDATION_MESSAGES
            .DIRECT_STATE_MUTATION,
          'test.reducer.ts'
        );

        expect(message).toContain('test.reducer.ts');
        expect(message).toContain('Direct state mutation');
      });

      it('should replace fileName placeholder correctly', () => {
        const message = NgRxImmutabilityConfiguration.buildMessage(
          NgRxImmutabilityConfiguration.VALIDATION_MESSAGES
            .USE_IMMUTABLE_UPDATE,
          'user.reducer.ts'
        );

        expect(message).toContain('user.reducer.ts');
        expect(message).toContain('immutable update patterns');
      });
    });
  });
});
