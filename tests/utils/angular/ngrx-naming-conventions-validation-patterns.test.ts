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
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
    project(files),
    config
  );

const C = NgRxNamingConventionsConfiguration;
const M = C.VALIDATION_MESSAGES;
const msg = (template: string, ...values: string[]) =>
  C.buildMessage(template, ...values);

const FEATURE = 'user';
const STATE = `src/app/${FEATURE}/+state`;
const ACTIONS = `${STATE}/user.actions.ts`;
const REDUCER = `${STATE}/user.reducer.ts`;
const SELECTORS = `${STATE}/user.selectors.ts`;
const EFFECTS = `${STATE}/user.effects.ts`;
// Messages name a file by its base name without the extension.

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
        const result = validate({
          'src/app/user/user.service.ts':
            "export const LoadUsers = createAction('load');\n",
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when there is no src directory', () => {
        const result = validate({
          'lib/user/+state/user.actions.ts':
            "export const LoadUsers = createAction('load');\n",
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should deduplicate violations and suggestions', () => {
        const result = validate({
          [ACTIONS]: `
            export const loadA = createAction('[Order] Load');
            export const loadB = createAction('[Order] Load');
          `,
        });

        expect(result.violations).toEqual([
          msg(
            M.ACTION_PREFIX_VIOLATION,
            '[Order] Load',
            FEATURE,
            'user.actions'
          ),
        ]);
      });

      it('should skip files with empty content', () => {
        const result = validate({ [ACTIONS]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should find facade and models files but judge no names in them', () => {
        const result = validate({
          [`${STATE}/user.facade.ts`]:
            "export const LoadUsers = createAction('load');\n",
          [`${STATE}/user.models.ts`]: 'export interface user_State {}\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should handle multiple file types in a project', () => {
        const result = validate({
          [ACTIONS]: "export const LoadUsers = createAction('[Order] Load');\n",
          [EFFECTS]: 'export class OrderEffects {}\n',
        });

        expect(result.violations).toEqual([
          msg(
            M.ACTION_PREFIX_VIOLATION,
            '[Order] Load',
            FEATURE,
            'user.actions'
          ),
        ]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            msg(M.ACTION_CREATOR_CASE_SUGGESTION, 'LoadUsers', 'user.actions'),
            msg(M.EFFECTS_CLASS_SUGGESTION, 'userEffects', 'user.effects'),
          ])
        );
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
