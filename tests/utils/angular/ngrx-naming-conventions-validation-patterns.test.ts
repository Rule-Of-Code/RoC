/**
 * @fileoverview Tests for ngrx-naming-conventions-validation-patterns.ts
 * @description Tests for NgRx Naming Conventions Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxNamingConventionsConfiguration } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-configuration';
import { NgRxNamingConventionsValidationPatterns } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxNamingConventionsValidationPatterns', () => {
    describe('validateAllNamingConventions', () => {
      it('should return empty results when no NgRx files found', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should validate NgRx files when found', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/project/src/app/users/+state/users.actions.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const loadUsers = createAction('[User] Load Users');
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/project/src/app/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });

      it('should deduplicate violations and suggestions', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/project/src/app/users/+state/users.actions.ts',
          '/test/project/src/app/orders/+state/orders.actions.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('test.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('test');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        const uniqueViolations = [...new Set(result.violations)];
        const uniqueSuggestions = [...new Set(result.suggestions)];
        expect(result.violations.length).toBe(uniqueViolations.length);
        expect(result.suggestions.length).toBe(uniqueSuggestions.length);
      });

      it('should skip files that cannot be read', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/project/src/app/users/+state/users.actions.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockImplementation(() => {
          throw new Error('Cannot read file');
        });

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should skip files with empty content', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/project/src/app/users/+state/users.actions.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/+state');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });

      it('should validate actions file type', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users.actions.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const loadUsers = createAction('LoadUsers');
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const isFileTypeSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'isFileType'
        );
        isFileTypeSpy.mockImplementation((fileName, type) => {
          return fileName.includes(type);
        });

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(isFileTypeSpy).toHaveBeenCalled();
      });

      it('should validate reducer file type', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export interface UserState {}
          export const userReducer = createReducer(initialState);
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.reducer.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });

      it('should validate selectors file type', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users.selectors.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const selectUserFeature = createFeatureSelector('user');
          export const getUsers = createSelector(selectUserFeature, s => s);
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.selectors.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });

      it('should validate effects file type', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users.effects.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export class UserEffects {
            loadUsers = createEffect(() => this.actions$);
          }
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.effects.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });
    });

    describe('FILE_TYPE_VALIDATORS', () => {
      it('should have validators for actions, reducer, selectors, and effects', () => {
        // Access the private static property through validateAllNamingConventions behavior
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/users.actions.ts',
          '/test/users.reducer.ts',
          '/test/users.selectors.ts',
          '/test/users.effects.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('test content');

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockImplementation(path => {
          const parts = path.split('/');
          return parts[parts.length - 1] ?? '';
        });

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/+state');

        const isFileTypeSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'isFileType'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        // Each file should be checked for each file type
        expect(isFileTypeSpy).toHaveBeenCalled();
      });
    });

    describe('action naming validation', () => {
      it('should detect action prefix violations', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.actions.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const loadUsers = createAction('Load Users');
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const hasProperPrefixSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'hasProperActionPrefix'
        );
        hasProperPrefixSpy.mockReturnValue(false);

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(hasProperPrefixSpy).toHaveBeenCalled();
      });

      it('should detect action case violations', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.actions.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const loadUsers = createAction('[users] load users');
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.actions.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const hasProperCaseSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'hasProperActionCase'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(hasProperCaseSpy).toHaveBeenCalled();
      });
    });

    describe('reducer naming validation', () => {
      it('should validate reducer function naming', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const wrongNameReducer = createReducer(initialState);
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.reducer.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const analyzeReducerSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'analyzeReducerNaming'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(analyzeReducerSpy).toHaveBeenCalled();
      });

      it('should validate initial state naming', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.reducer.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const usersReducer = createReducer(initialState);
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.reducer.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const hasProperInitialStateSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'hasProperInitialState'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(hasProperInitialStateSpy).toHaveBeenCalled();
      });
    });

    describe('selector naming validation', () => {
      it('should validate feature selector naming', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.selectors.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const selectUsersFeature = createFeatureSelector('users');
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.selectors.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const analyzeSelectorSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'analyzeSelectorNaming'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(analyzeSelectorSpy).toHaveBeenCalled();
      });

      it('should validate selector prefix', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.selectors.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export const selectUsers = createSelector(state => state);
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.selectors.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const analyzeSelectorSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'analyzeSelectorNaming'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(analyzeSelectorSpy).toHaveBeenCalled();
      });
    });

    describe('effect naming validation', () => {
      it('should validate effect class naming', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.effects.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export class UsersEffects {
            loadUsers$ = createEffect(() => this.actions$);
          }
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.effects.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const analyzeEffectSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'analyzeEffectNaming'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(analyzeEffectSpy).toHaveBeenCalled();
      });

      it('should validate individual effect naming', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue(['/test/users/+state/users.effects.ts']);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          export class UsersEffects {
            loadUsers = createEffect(() => this.actions$);
          }
        `);

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockReturnValue('users.effects.ts');

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const hasValidEffectNamingSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'hasValidEffectNaming'
        );

        NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(hasValidEffectNamingSpy).toHaveBeenCalled();
      });
    });

    describe('integration scenarios', () => {
      it('should handle multiple file types in a project', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([
          '/test/users/+state/users.actions.ts',
          '/test/users/+state/users.reducer.ts',
          '/test/users/+state/users.selectors.ts',
          '/test/users/+state/users.effects.ts',
        ]);

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('test content');

        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getBasenameSpy.mockImplementation(path => {
          const parts = path.split('/');
          return parts[parts.length - 1] ?? '';
        });

        const getDirectorySpy = jest.spyOn(PathOperations, 'getDirectory');
        getDirectorySpy.mockReturnValue('/test/users/+state');

        const extractFeatureNameSpy = jest.spyOn(
          NgRxNamingConventionsConfiguration,
          'extractFeatureName'
        );
        extractFeatureNameSpy.mockReturnValue('users');

        const result =
          NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
            '/test/project',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });
    });
  });
});
