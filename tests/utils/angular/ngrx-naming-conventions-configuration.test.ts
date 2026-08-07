/**
 * @fileoverview Tests for ngrx-naming-conventions-configuration.ts
 * @description Tests for NgRx Naming Conventions Configuration utility
 */

import { NgRxNamingConventionsConfiguration } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-configuration';
import { FILE_EXTENSIONS } from '../../../src/utils/constants';

describe('utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-configuration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxNamingConventionsConfiguration', () => {
    describe('NGRX_FILE_EXTENSIONS', () => {
      it('should contain actions file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.ACTIONS_TS);
      });

      it('should contain reducer file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.REDUCER_TS);
      });

      it('should contain selectors file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.SELECTORS_TS);
      });

      it('should contain effects file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.EFFECTS_TS);
      });

      it('should contain facade file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.FACADE_TS);
      });

      it('should contain models file extension', () => {
        const extensions =
          NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.MODELS_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxNamingConventionsConfiguration.NGRX_FILE_EXTENSIONS)
        ).toBe(true);
      });
    });

    describe('FILE_READ_OPTIONS', () => {
      it('should have UTF-8 encoding', () => {
        expect(
          NgRxNamingConventionsConfiguration.FILE_READ_OPTIONS.encoding
        ).toBe('utf8');
      });

      it('should have fallbackToEmpty set to true', () => {
        expect(
          NgRxNamingConventionsConfiguration.FILE_READ_OPTIONS.fallbackToEmpty
        ).toBe(true);
      });
    });

    describe('extractFeatureName', () => {
      it('should extract feature name from path with state folder', () => {
        const path = '/project/src/app/users/+state/users.actions.ts';
        const result =
          NgRxNamingConventionsConfiguration.extractFeatureName(path);
        expect(result).toBe('users');
      });

      it('should return empty string when no state folder found', () => {
        const path = '/project/src/app/users/users.actions.ts';
        const result =
          NgRxNamingConventionsConfiguration.extractFeatureName(path);
        expect(result).toBe('');
      });

      it('should handle nested feature paths', () => {
        const path =
          '/project/src/app/features/orders/+state/orders.reducer.ts';
        const result =
          NgRxNamingConventionsConfiguration.extractFeatureName(path);
        expect(result).toBe('orders');
      });

      it('should handle empty path', () => {
        const result =
          NgRxNamingConventionsConfiguration.extractFeatureName('');
        expect(result).toBe('');
      });
    });

    describe('buildMessage', () => {
      it('should format message with single placeholder', () => {
        const template = 'Error in {0}';
        const result = NgRxNamingConventionsConfiguration.buildMessage(
          template,
          'file.ts'
        );
        expect(result).toBe('Error in file.ts');
      });

      it('should format message with multiple placeholders', () => {
        const template = 'Action {0} should have prefix [{1}]';
        const result = NgRxNamingConventionsConfiguration.buildMessage(
          template,
          'loadUsers',
          'User'
        );
        expect(result).toBe('Action loadUsers should have prefix [User]');
      });

      it('should handle template without placeholders', () => {
        const template = 'No placeholders here';
        const result =
          NgRxNamingConventionsConfiguration.buildMessage(template);
        expect(result).toBe('No placeholders here');
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have ACTION_PREFIX_VIOLATION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .ACTION_PREFIX_VIOLATION
        ).toContain('{0}');
      });

      it('should have ACTION_PREFIX_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .ACTION_PREFIX_SUGGESTION
        ).toBeDefined();
      });

      it('should have ACTION_CASE_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .ACTION_CASE_SUGGESTION
        ).toContain('PascalCase');
      });

      it('should have REDUCER_NAME_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .REDUCER_NAME_SUGGESTION
        ).toBeDefined();
      });

      it('should have SELECTOR_PREFIX_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .SELECTOR_PREFIX_SUGGESTION
        ).toContain('select');
      });

      it('should have EFFECTS_CLASS_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .EFFECTS_CLASS_SUGGESTION
        ).toBeDefined();
      });

      it('should have EFFECT_NAMING_SUGGESTION message', () => {
        expect(
          NgRxNamingConventionsConfiguration.VALIDATION_MESSAGES
            .EFFECT_NAMING_SUGGESTION
        ).toContain('$');
      });
    });

    describe('NAMING_PATTERNS', () => {
      it('should have createAction pattern', () => {
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.createAction;
        expect(pattern).toBeInstanceOf(RegExp);
      });

      it('should have exportConst pattern', () => {
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.exportConst;
        expect(pattern).toBeInstanceOf(RegExp);
      });

      it('should have reducer pattern', () => {
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.reducer;
        expect(pattern).toBeInstanceOf(RegExp);
      });

      it('should have effectClass pattern', () => {
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.effectClass;
        expect(pattern).toBeInstanceOf(RegExp);
      });

      it('should have featureSelector pattern', () => {
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.featureSelector;
        expect(pattern).toBeInstanceOf(RegExp);
      });

      it('should detect createAction usage', () => {
        const content = "createAction('[User] Load Users')";
        const pattern =
          NgRxNamingConventionsConfiguration.NAMING_PATTERNS.createAction;
        expect(content.match(pattern)).not.toBeNull();
      });
    });

    describe('isFileType', () => {
      it('should return true for matching file type', () => {
        expect(
          NgRxNamingConventionsConfiguration.isFileType(
            'user.actions.ts',
            'actions'
          )
        ).toBe(true);
      });

      it('should return false for non-matching file type', () => {
        expect(
          NgRxNamingConventionsConfiguration.isFileType(
            'user.reducer.ts',
            'actions'
          )
        ).toBe(false);
      });

      it('should handle reducer file type', () => {
        expect(
          NgRxNamingConventionsConfiguration.isFileType(
            'user.reducer.ts',
            'reducer'
          )
        ).toBe(true);
      });

      it('should handle selectors file type', () => {
        expect(
          NgRxNamingConventionsConfiguration.isFileType(
            'user.selectors.ts',
            'selectors'
          )
        ).toBe(true);
      });

      it('should handle effects file type', () => {
        expect(
          NgRxNamingConventionsConfiguration.isFileType(
            'user.effects.ts',
            'effects'
          )
        ).toBe(true);
      });
    });

    describe('hasProperActionPrefix', () => {
      it('should return true for action with proper prefix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionPrefix(
            '[User] Load Users',
            'User'
          )
        ).toBe(true);
      });

      it('should return false for action without proper prefix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionPrefix(
            'Load Users',
            'User'
          )
        ).toBe(false);
      });

      it('should return false for action with wrong prefix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionPrefix(
            '[Order] Load Users',
            'User'
          )
        ).toBe(false);
      });
    });

    describe('hasProperActionCase', () => {
      it('should return true for PascalCase action text', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionCase('LoadUsers')
        ).toBe(true);
      });

      it('should return true for capitalized words action text', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionCase('Load Users')
        ).toBe(true);
      });

      it('should return false for lowercase action text', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionCase('load users')
        ).toBe(false);
      });
    });

    describe('hasProperActionCreatorCase', () => {
      it('should return true for camelCase creator', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionCreatorCase(
            'loadUsers'
          )
        ).toBe(true);
      });

      it('should return false for PascalCase creator', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperActionCreatorCase(
            'LoadUsers'
          )
        ).toBe(false);
      });
    });

    describe('hasProperSelectorPrefix', () => {
      it('should return true for selector with select prefix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperSelectorPrefix(
            'selectUsers'
          )
        ).toBe(true);
      });

      it('should return false for selector without select prefix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperSelectorPrefix('getUsers')
        ).toBe(false);
      });
    });

    describe('hasProperStateInterfaceCase', () => {
      it('should return true for PascalCase state interface', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperStateInterfaceCase(
            'UserState'
          )
        ).toBe(true);
      });

      it('should return false for camelCase state interface', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasProperStateInterfaceCase(
            'userState'
          )
        ).toBe(false);
      });
    });

    describe('hasValidEffectNaming', () => {
      it('should return true for effect ending with $', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasValidEffectNaming('loadUsers$')
        ).toBe(true);
      });

      it('should return true for effect ending with Effect', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasValidEffectNaming(
            'loadUsersEffect'
          )
        ).toBe(true);
      });

      it('should return false for effect without proper suffix', () => {
        expect(
          NgRxNamingConventionsConfiguration.hasValidEffectNaming('loadUsers')
        ).toBe(false);
      });
    });

    describe('generateExpectedNames', () => {
      it('should generate expected reducer name', () => {
        const names =
          NgRxNamingConventionsConfiguration.generateExpectedNames('user');
        expect(names.reducer).toBe('userReducer');
      });

      it('should generate expected initial state name', () => {
        const names =
          NgRxNamingConventionsConfiguration.generateExpectedNames('user');
        expect(names.initialState).toBe('initialuserState');
      });

      it('should generate expected state interface name', () => {
        const names =
          NgRxNamingConventionsConfiguration.generateExpectedNames('user');
        expect(names.stateInterface).toBe('userState');
      });

      it('should generate expected feature selector name', () => {
        const names =
          NgRxNamingConventionsConfiguration.generateExpectedNames('user');
        expect(names.featureSelector).toBe('selectuserFeature');
      });

      it('should generate expected effects class name', () => {
        const names =
          NgRxNamingConventionsConfiguration.generateExpectedNames('user');
        expect(names.effectsClass).toBe('userEffects');
      });
    });

    describe('findMatches', () => {
      it('should find matches in content', () => {
        const content = "export const loadUsers = createAction('[User] Load')";
        const pattern = /export const (\w+)/g;
        const result = NgRxNamingConventionsConfiguration.findMatches(
          content,
          pattern
        );
        expect(result).not.toBeNull();
      });

      it('should return null when no matches', () => {
        const content = 'no matches here';
        const pattern = /export const (\w+)/g;
        const result = NgRxNamingConventionsConfiguration.findMatches(
          content,
          pattern
        );
        expect(result).toBeNull();
      });
    });

    describe('cleanActionName', () => {
      it('should remove action prefix', () => {
        const result =
          NgRxNamingConventionsConfiguration.cleanActionName(
            '[User] Load Users'
          );
        expect(result).toBe('Load Users');
      });

      it('should handle action without prefix', () => {
        const result =
          NgRxNamingConventionsConfiguration.cleanActionName('Load Users');
        expect(result).toBe('Load Users');
      });
    });

    describe('hasProperInitialState', () => {
      it('should return true when initial state with feature name exists', () => {
        const content = 'const initialState = initialUserState;';
        const result = NgRxNamingConventionsConfiguration.hasProperInitialState(
          content,
          'User'
        );
        expect(result).toBe(true);
      });

      it('should return false when initial state is missing', () => {
        const content = 'const state = {};';
        const result = NgRxNamingConventionsConfiguration.hasProperInitialState(
          content,
          'User'
        );
        expect(result).toBe(false);
      });
    });

    describe('analyzeActionNaming', () => {
      it('should return action matches from content', () => {
        const content = "export const loadUsers = createAction('[User] Load')";
        const result = NgRxNamingConventionsConfiguration.analyzeActionNaming(
          content,
          'user'
        );
        expect(result.actionMatches).not.toBeNull();
        expect(result.actionCreatorMatches).not.toBeNull();
      });

      it('should return null matches for empty content', () => {
        const result = NgRxNamingConventionsConfiguration.analyzeActionNaming(
          '',
          'user'
        );
        expect(result.actionMatches).toBeNull();
        expect(result.actionCreatorMatches).toBeNull();
      });
    });

    describe('analyzeReducerNaming', () => {
      it('should return reducer matches from content', () => {
        const content = `
          export interface UserState {}
          export const userReducer = createReducer(initialState);
        `;
        const result =
          NgRxNamingConventionsConfiguration.analyzeReducerNaming(content);
        expect(result.reducerMatches).not.toBeNull();
        expect(result.interfaceMatches).not.toBeNull();
      });
    });

    describe('analyzeSelectorNaming', () => {
      it('should return selector matches from content', () => {
        const content = `
          export const selectUserFeature = createFeatureSelector('user');
          export const selectUsers = createSelector(selectUserFeature, s => s.users);
        `;
        const result =
          NgRxNamingConventionsConfiguration.analyzeSelectorNaming(content);
        expect(result.featureSelectorMatches).not.toBeNull();
        expect(result.generalSelectorMatches).not.toBeNull();
      });
    });

    describe('analyzeEffectNaming', () => {
      it('should return effect matches from content', () => {
        const content = `
          export class UserEffects {
            loadUsers$ = createEffect(() => this.actions$);
          }
        `;
        const result =
          NgRxNamingConventionsConfiguration.analyzeEffectNaming(content);
        expect(result.classMatches).not.toBeNull();
        // effectMatches uses effectAssignment pattern which matches 'name = createEffect'
        expect(result).toHaveProperty('effectMatches');
      });

      it('should return analysis result with effectMatches property', () => {
        const content = 'export class TestEffects { }';
        const result =
          NgRxNamingConventionsConfiguration.analyzeEffectNaming(content);
        expect(result).toHaveProperty('classMatches');
        expect(result).toHaveProperty('effectMatches');
      });
    });

    describe('extractNameFromMatch', () => {
      it('should extract name using pattern', () => {
        const match = 'const loadUsers = createAction';
        const pattern = /const (\w+)/;
        const result = NgRxNamingConventionsConfiguration.extractNameFromMatch(
          match,
          pattern
        );
        expect(result).toBe('loadUsers');
      });

      it('should return undefined when no match', () => {
        const match = 'no match here';
        const pattern = /const (\w+)/;
        const result = NgRxNamingConventionsConfiguration.extractNameFromMatch(
          match,
          pattern
        );
        expect(result).toBeUndefined();
      });
    });

    describe('extractNamesFromMatches', () => {
      it('should extract names from matches array', () => {
        const matches = [
          'const loadUsers = createAction',
          'const saveUsers = createAction',
        ] as unknown as RegExpMatchArray;
        const pattern = /const (\w+)/;
        const result =
          NgRxNamingConventionsConfiguration.extractNamesFromMatches(
            matches,
            pattern
          );
        expect(result).toContain('loadUsers');
        expect(result).toContain('saveUsers');
      });

      it('should return empty array for null matches', () => {
        const result =
          NgRxNamingConventionsConfiguration.extractNamesFromMatches(
            null,
            /const (\w+)/
          );
        expect(result).toEqual([]);
      });

      it('should filter out undefined values', () => {
        const matches = [
          'const loadUsers = createAction',
          'no match here',
        ] as unknown as RegExpMatchArray;
        const pattern = /const (\w+)/;
        const result =
          NgRxNamingConventionsConfiguration.extractNamesFromMatches(
            matches,
            pattern
          );
        expect(result).toHaveLength(1);
        expect(result).toContain('loadUsers');
      });
    });
  });
});
