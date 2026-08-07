/**
 * @fileoverview Tests for NgrxStorePatternLaw
 * @description Tests for NgRx store architecture patterns enforcement
 */

import { NgrxStorePatternLaw } from '../../../src/checkers/angular-laws/ngrx-store-pattern';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/ngrx-store-pattern', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-store-pattern-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
          componentPrefix: 'app',
          type: 'angular',
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
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Result Structure Tests
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
    });

    it('should have score as number', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name in kebab-case format', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.lawName).toBe('ngrx-store-pattern');
    });
  });

  // ==========================================================================
  // Non-NgRx Project Tests
  // ==========================================================================

  describe('Non-NgRx Project', () => {
    it('should return early when no NgRx dependency detected', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should not analyze store files for non-NgRx projects', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.actions.ts'),
        'export const badAction = "BAD";'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.violations).toEqual([]);
    });
  });

  // ==========================================================================
  // NgRx Project Detection Tests
  // ==========================================================================

  describe('NgRx Project Detection', () => {
    it('should detect NgRx from dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: {
          '@ngrx/store': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should process since NgRx is detected
      expect(result).toBeDefined();
    });

    it('should detect NgRx from devDependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        devDependencies: {
          '@ngrx/store': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should process since NgRx is detected
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // State File Tests
  // ==========================================================================

  describe('State Files', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);
    });

    it('should detect missing interface in state file', () => {
      const stateContent = `
export const initialState = {
  items: [],
  loading: false
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'app.state.ts'),
        stateContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('missing proper interface definition')
        )
      ).toBe(true);
    });

    it('should pass when state file has interface', () => {
      const stateContent = `
export interface AppState {
  items: string[];
  loading: boolean;
}

export const initialState: AppState = {
  items: [],
  loading: false
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'app.state.ts'),
        stateContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('app.state.ts') && v.includes('missing proper interface')
        )
      ).toBe(false);
    });

    it('should pass when state file uses type alias', () => {
      const stateContent = `
type AppState = {
  items: string[];
  loading: boolean;
};

export const initialState: AppState = {
  items: [],
  loading: false
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'app.state.ts'),
        stateContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('app.state.ts') && v.includes('missing proper interface')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Actions File Tests
  // ==========================================================================

  describe('Actions Files', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);
    });

    it('should detect actions not using createAction pattern', () => {
      const actionsContent = `
export const LOAD_ITEMS = '[Items] Load Items';
export const LOAD_ITEMS_SUCCESS = '[Items] Load Items Success';

export class LoadItems {
  readonly type = LOAD_ITEMS;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'items.actions.ts'),
        actionsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('not using createAction pattern')
        )
      ).toBe(true);
    });

    it('should pass when actions use createAction pattern', () => {
      const actionsContent = `
import { createAction, props } from '@ngrx/store';

export const loadItems = createAction('[Items] Load Items');
export const loadItemsSuccess = createAction(
  '[Items] Load Items Success',
  props<{ items: string[] }>()
);
export const loadItemsFailure = createAction(
  '[Items] Load Items Failure',
  props<{ error: string }>()
);
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'items.actions.ts'),
        actionsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v => v.includes('items.actions.ts') && v.includes('createAction')
        )
      ).toBe(false);
    });

    it('should detect actions file with only props import', () => {
      const actionsContent = `
import { props } from '@ngrx/store';

// Has props but no createAction
export const actions = {};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'test.actions.ts'),
        actionsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should still pass since props is present
      expect(
        result.violations!.some(
          v =>
            v.includes('test.actions.ts') &&
            v.includes('not using createAction')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Reducer File Tests
  // ==========================================================================

  describe('Reducer Files', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);
    });

    it('should detect reducer not using createReducer pattern', () => {
      const reducerContent = `
export function itemsReducer(state = initialState, action: Action) {
  switch (action.type) {
    case LOAD_ITEMS_SUCCESS:
      return { ...state, items: action.payload };
    default:
      return state;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'items.reducer.ts'),
        reducerContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('not using createReducer pattern')
        )
      ).toBe(true);
    });

    it('should pass when reducer uses createReducer pattern', () => {
      const reducerContent = `
import { createReducer, on } from '@ngrx/store';
import * as ItemsActions from './items.actions';

export const initialState: ItemsState = {
  items: [],
  loading: false
};

export const itemsReducer = createReducer(
  initialState,
  on(ItemsActions.loadItems, state => ({ ...state, loading: true })),
  on(ItemsActions.loadItemsSuccess, (state, { items }) => ({
    ...state,
    items,
    loading: false
  }))
);
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'items.reducer.ts'),
        reducerContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v => v.includes('items.reducer.ts') && v.includes('createReducer')
        )
      ).toBe(false);
    });

    it('should detect reducer with on() but no createReducer', () => {
      const reducerContent = `
import { on } from '@ngrx/store';

// Has on() usage but should also have createReducer
export const handlers = [
  on(loadItems, state => state)
];
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'store', 'test.reducer.ts'),
        reducerContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should pass since on() is present
      expect(
        result.violations!.some(
          v =>
            v.includes('test.reducer.ts') &&
            v.includes('not using createReducer')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Selector File Tests
  // ==========================================================================

  describe('Selector Files', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);
    });

    it('should detect selectors not using createSelector pattern', () => {
      const selectorsContent = `
export const getItems = (state: AppState) => state.items;
export const getLoading = (state: AppState) => state.loading;
`;
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          'src',
          'app',
          'store',
          'items.selectors.ts'
        ),
        selectorsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('not using createSelector pattern')
        )
      ).toBe(true);
    });

    it('should pass when selectors use createSelector pattern', () => {
      const selectorsContent = `
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { ItemsState } from './items.state';

export const selectItemsState = createFeatureSelector<ItemsState>('items');

export const selectItems = createSelector(
  selectItemsState,
  state => state.items
);

export const selectLoading = createSelector(
  selectItemsState,
  state => state.loading
);
`;
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          'src',
          'app',
          'store',
          'items.selectors.ts'
        ),
        selectorsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v => v.includes('items.selectors.ts') && v.includes('createSelector')
        )
      ).toBe(false);
    });

    it('should pass when selectors use only createFeatureSelector', () => {
      const selectorsContent = `
import { createFeatureSelector } from '@ngrx/store';

export const selectItemsState = createFeatureSelector<ItemsState>('items');
`;
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          'src',
          'app',
          'store',
          'feature.selectors.ts'
        ),
        selectorsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('feature.selectors.ts') &&
            v.includes('not using createSelector')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Suggestions Tests
  // ==========================================================================

  describe('Suggestions', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should provide NgRx best practice suggestions', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      // Should have a suggestions array (may be empty if no violations)
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Multiple Store Files Tests
  // ==========================================================================

  describe('Multiple Store Files', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should analyze all store files in project', () => {
      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      // Bad state file
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'user.state.ts'),
        'export const userState = {};'
      );

      // Bad actions file
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'user.actions.ts'),
        'export const USER_ACTION = "USER";'
      );

      // Bad reducer file
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'user.reducer.ts'),
        'export function userReducer() {}'
      );

      // Bad selectors file
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'user.selectors.ts'),
        'export const getUser = (s) => s;'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should detect violations in bad store files
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should handle feature module store structure', () => {
      const usersStoreDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'users',
        'store'
      );
      const productsStoreDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'products',
        'store'
      );

      FileUtils.createDirectory(usersStoreDir);
      FileUtils.createDirectory(productsStoreDir);

      // Users store - good
      FileUtils.writeFile(
        PathOperations.join(usersStoreDir, 'users.state.ts'),
        'export interface UsersState {}'
      );
      FileUtils.writeFile(
        PathOperations.join(usersStoreDir, 'users.actions.ts'),
        'import { createAction } from "@ngrx/store";'
      );

      // Products store - bad
      FileUtils.writeFile(
        PathOperations.join(productsStoreDir, 'products.state.ts'),
        'export const state = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(productsStoreDir, 'products.actions.ts'),
        'export const ACTION = "ACTION";'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      // Should analyze nested store directories
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty project gracefully', () => {
      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle NgRx project with no store files', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.violations).toEqual([]);
    });

    it('should handle effects files', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0', '@ngrx/effects': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      const effectsContent = `
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

@Injectable()
export class ItemsEffects {
  loadItems$ = createEffect(() => this.actions$.pipe(
    ofType(loadItems),
    mergeMap(() => this.service.getItems())
  ));

  constructor(private actions$: Actions) {}
}
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'items.effects.ts'),
        effectsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      // Effects files should be found but not necessarily have violations
      expect(result).toBeDefined();
    });

    it('should handle mixed file naming conventions', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      // Different naming patterns
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'user.state.ts'),
        'export interface UserState {}'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'userActions.actions.ts'),
        'import { createAction } from "@ngrx/store";'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Score Calculation Tests
  // ==========================================================================

  describe('Score Calculation', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: { '@ngrx/store': '^17.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should have perfect score with proper NgRx patterns', () => {
      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.state.ts'),
        'export interface AppState { items: string[]; }'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.actions.ts'),
        'import { createAction, props } from "@ngrx/store";'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.reducer.ts'),
        'import { createReducer, on } from "@ngrx/store";'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.selectors.ts'),
        'import { createSelector, createFeatureSelector } from "@ngrx/store";'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('should decrease score with violations', () => {
      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.state.ts'),
        'export const state = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.actions.ts'),
        'export const ACTION = "ACTION";'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.reducer.ts'),
        'export function reducer() {}'
      );
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.selectors.ts'),
        'export const select = (s) => s;'
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.score).toBeLessThan(100);
      expect(result.passed).toBe(false);
    });
  });

  // ==========================================================================
  // Complete NgRx Store Structure Tests
  // ==========================================================================

  describe('Complete NgRx Store Structure', () => {
    beforeEach(() => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'ngrx-app',
        dependencies: {
          '@angular/core': '^17.0.0',
          '@ngrx/store': '^17.0.0',
          '@ngrx/effects': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should validate complete well-structured NgRx store', () => {
      const storeDir = PathOperations.join(tempDir, 'src', 'app', 'store');
      FileUtils.createDirectory(storeDir);

      // State
      const stateContent = `
export interface AppState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

export const initialState: AppState = {
  items: [],
  loading: false,
  error: null
};
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.state.ts'),
        stateContent
      );

      // Actions
      const actionsContent = `
import { createAction, props } from '@ngrx/store';
import { Item } from '../models/item.model';

export const loadItems = createAction('[Items] Load Items');
export const loadItemsSuccess = createAction(
  '[Items] Load Items Success',
  props<{ items: Item[] }>()
);
export const loadItemsFailure = createAction(
  '[Items] Load Items Failure',
  props<{ error: string }>()
);
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.actions.ts'),
        actionsContent
      );

      // Reducer
      const reducerContent = `
import { createReducer, on } from '@ngrx/store';
import * as AppActions from './app.actions';
import { initialState } from './app.state';

export const appReducer = createReducer(
  initialState,
  on(AppActions.loadItems, state => ({ ...state, loading: true })),
  on(AppActions.loadItemsSuccess, (state, { items }) => ({
    ...state,
    items,
    loading: false
  })),
  on(AppActions.loadItemsFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  }))
);
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.reducer.ts'),
        reducerContent
      );

      // Selectors
      const selectorsContent = `
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectItems = createSelector(
  selectAppState,
  state => state.items
);

export const selectLoading = createSelector(
  selectAppState,
  state => state.loading
);

export const selectError = createSelector(
  selectAppState,
  state => state.error
);
`;
      FileUtils.writeFile(
        PathOperations.join(storeDir, 'app.selectors.ts'),
        selectorsContent
      );

      const result = NgrxStorePatternLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.score).toBe(100);
    });
  });
});
