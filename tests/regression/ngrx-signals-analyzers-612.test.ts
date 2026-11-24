/**
 * #612 — the Angular Signals and NgRx analyzers reported things that are not
 * there, and held two checks that could never report.
 *
 * Every point runs the analyzer the law calls on a real temporary project
 * (no mocks of the analyzer under test). Each false finding has a control
 * next to it: the real defect is still reported.
 */
import path from 'path';
import { NgRxSelectorsMemoizationMandateLaw } from '../../src/checkers/angular-laws/ngrx-selectors-memoization-mandate';
import { AngularSignalImportsAnalyzer } from '../../src/utils/angular/angular-signal-imports/angular-signal-imports-analyzer';
import { NgRxEffectPatternsValidation } from '../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { NgRxErrorHandlingValidationPatterns } from '../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { NgRxFileOrganizationValidationPatterns } from '../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns';
import { NgRxImmutabilityValidationPatterns } from '../../src/utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns';
import { NgRxMemoizationValidationPatterns } from '../../src/utils/angular/ngrx-memoization/ngrx-memoization-validation-patterns';
import { NgRxNamingConventionsValidationPatterns } from '../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import * as tsxSource from '../../src/utils/react/tsx-source';
import { manifest, project } from '../checkers/toolkit-fixture';

const config = FileUtils.getMinimalDefaultConfig();
const COMPONENT = 'src/app/app.component.ts';

const signalImports = (files: Record<string, string>) =>
  AngularSignalImportsAnalyzer.checkSignalImports(project(files), config);

describe('#612 point 1: WritableSignal<T> is not a use of the Signal type', () => {
  it('a WritableSignal<number> annotation does not ask for Signal', () => {
    const result = signalImports({
      [COMPONENT]: `
        import { signal, WritableSignal } from '@angular/core';
        const count: WritableSignal<number> = signal(0);
      `,
    });
    expect(result.violations).toEqual([]);
  });

  it('control: Signal<number> without importing Signal is still reported', () => {
    const result = signalImports({
      [COMPONENT]: `
        import { signal } from '@angular/core';
        const count: Signal<number> = signal(0);
      `,
    });
    expect(result.violations).toEqual([
      'Signal type used but not imported from @angular/core in app.component',
    ]);
  });
});

describe('#612 point 2: an inline `type` specifier imports the symbol', () => {
  it('import { signal, type WritableSignal } imports WritableSignal', () => {
    const result = signalImports({
      [COMPONENT]: `
        import { signal, type WritableSignal } from '@angular/core';
        let state: WritableSignal;
        const count = signal(0);
      `,
    });
    expect(result.violations).toEqual([]);
  });

  it('control: a type-only import of another symbol does not import WritableSignal', () => {
    const result = signalImports({
      [COMPONENT]: `
        import { signal, type Signal } from '@angular/core';
        let state: WritableSignal;
        const count = signal(0);
      `,
    });
    expect(result.violations).toEqual([
      'WritableSignal used but not imported from @angular/core in app.component',
    ]);
  });
});

describe('#612 point 3: any Angular from 16 on supports signals', () => {
  const withAngular = (version: string) =>
    signalImports({
      'package.json': manifest({ '@angular/core': version }),
      [COMPONENT]: `
        import { signal } from '@angular/core';
        const count = signal(0);
      `,
    });

  it.each([
    '^16.0.0',
    '17.3.1',
    '~18.2.0',
    '^19.2.0',
    '^20.0.0',
    '~21.0.1',
    '>=16.1.0',
  ])('Angular %s gets no version suggestion', version => {
    expect(withAngular(version).suggestions).toEqual([]);
  });

  it.each(['^15.2.0', '~14.0.0', '13.4.0'])(
    'control: Angular %s is still told signals need 16+',
    version => {
      expect(withAngular(version).suggestions).toEqual([
        `Signals require Angular 16+ - current version: ${version} in app.component`,
      ]);
    }
  );
});

describe('#612 point 4: @Injectable({ providedIn: "root" }) is an @Injectable', () => {
  const effects = (content: string) =>
    NgRxEffectPatternsValidation.validateAllEffectPatterns(
      project({ 'src/state/user.effects.ts': content }),
      config
    );

  it('an @Injectable with options is not reported missing', () => {
    const result = effects(`
      @Injectable({ providedIn: 'root' })
      export class UserEffects {
        load$ = createEffect(() => this.actions$.pipe(catchError(() => EMPTY)));
      }
    `);
    expect(result.violations).toEqual([]);
  });

  it('control: an effects class with no @Injectable is still reported', () => {
    const result = effects(`
      export class UserEffects {
        load$ = createEffect(() => this.actions$.pipe(catchError(() => EMPTY)));
      }
    `);
    expect(result.violations).toEqual([
      'Missing @Injectable decorator in user.effects',
    ]);
  });
});

describe('#612 point 5: an empty or unreadable effects file is not judged', () => {
  it('a file that cannot be read is skipped', () => {
    const root = project({ 'package.json': '{}' });
    const violations: string[] = [];
    const suggestions: string[] = [];
    NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
      path.join(root, 'src/state/missing.effects.ts'),
      violations,
      suggestions
    );
    expect({ violations, suggestions }).toEqual({
      violations: [],
      suggestions: [],
    });
  });

  it('an empty effects file is skipped', () => {
    const result =
      NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
        project({ 'src/state/empty.effects.ts': '' }),
        config
      );
    expect(result.violations).toEqual([]);
  });

  it('control: an effect with no catchError is still reported', () => {
    const result =
      NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
        project({
          'src/state/user.effects.ts':
            'load$ = createEffect(() => this.actions$.pipe(map(() => done())));\n',
        }),
        config
      );
    expect(result.violations).toEqual([
      'Missing error handling (catchError) in user.effects',
    ]);
  });
});

const STATE = 'src/app/user/+state';

describe('#612 point 6: test files in +state are not misnamed or a second reducer', () => {
  const organize = (files: Record<string, string>) =>
    NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
      project(files),
      config
    );

  it('user.reducer.spec.ts next to user.reducer.ts gets no suggestion', () => {
    const result = organize({
      [`${STATE}/index.ts`]: '',
      [`${STATE}/user.reducer.ts`]: '',
      [`${STATE}/user.reducer.spec.ts`]: '',
    });
    expect(result.suggestions).toEqual([]);
  });

  it('control: two reducers and a non-NgRx file are still reported', () => {
    const result = organize({
      [`${STATE}/index.ts`]: '',
      [`${STATE}/user.reducer.ts`]: '',
      [`${STATE}/user-extra.reducer.ts`]: '',
      [`${STATE}/user.helpers.ts`]: '',
      [`${STATE}/user.reducer.spec.ts`]: '',
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        'Consider using standard NgRx file naming for user.helpers.ts in user/+state/',
        'Multiple reducer files found in user/+state/, consider consolidating',
      ])
    );
  });
});

describe('#612 point 7: a directory that does not exist is skipped', () => {
  it('a missing +state directory is not judged', () => {
    const root = project({ 'package.json': '{}' });
    const result =
      NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
        path.join(root, 'src/app/missing/+state'),
        config
      );
    expect(result).toEqual({ violations: [], suggestions: [] });
  });

  it('control: an existing +state without index.ts is still reported', () => {
    const root = project({ [`${STATE}/user.reducer.ts`]: '' });
    const result =
      NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
        path.join(root, STATE),
        config
      );
    expect(result.violations).toEqual([
      'Missing index.ts barrel export in user/+state/',
    ]);
  });
});

const immutability = (content: string) =>
  NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
    project({ 'src/app/state/user.reducer.ts': content }),
    config
  );

describe('#612 point 8: a comparison is not a mutation', () => {
  it('state.loading === true is not reported', () => {
    const result = immutability(`
      on(toggle, (state) => {
        if (state.loading === true) { return { ...state, loading: false }; }
        if (state.count == 0) { return { ...state, count: 1 }; }
        return { ...state };
      })
    `);
    expect(result.violations).toEqual([]);
  });

  it('control: state.loading = true is still a direct mutation', () => {
    const result = immutability(`
      on(toggle, (state) => {
        state.loading = true;
        return { ...state };
      })
    `);
    expect(result.violations).toEqual([
      'Direct state mutation detected in user.reducer',
    ]);
  });
});

describe('#612 point 9: the arrow reducer returning ({ ...state }) is an object literal return', () => {
  it('(state) => ({ ...state, items }) gets no suggestion', () => {
    const result = immutability(`
      export const reducer = createReducer(
        initialState,
        on(loadSuccess, (state, { items }) => ({ ...state, items }))
      );
    `);
    expect(result.suggestions).toEqual([]);
  });

  it('control: a reducer that returns the same state object is still told', () => {
    const result = immutability(`
      export const reducer = createReducer(
        initialState,
        on(loadSuccess, (state) => { const next = Object.freeze(state); return next; })
      );
    `);
    expect(result.suggestions).toEqual([
      'Use object literal returns for state updates in user.reducer',
    ]);
  });
});

describe('#612 point 10: "Direct store.select usage" fires on a select that bypasses selectors', () => {
  const component = (content: string) =>
    NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
      project({ 'src/app/user/user.component.ts': content }),
      config
    );
  const DIRECT =
    'Direct store.select usage instead of selector in user.component';

  const NGRX = "import { Store } from '@ngrx/store';";

  it.each([
    "this.users$ = this.store.select('users');",
    'this.users$ = this.store.select("users");',
    'this.users$ = this.store.select(state => state.users);',
    'this.users$ = this.store.select((state: AppState) => state.users);',
    'this.users$ = this.store.select<User[]>(s => s.users);',
    'this.users$ = this.store.select(function (s) { return s.users; });',
    'this.users$ = this.store.select((s => s.users) as Projector);',
    `${NGRX} class C { private readonly state$ = inject(Store); u = this.state$.select('users'); }`,
    `${NGRX} class C { constructor(private ngrx: Store<AppState>) { this.ngrx.select('users'); } }`,
    `${NGRX} class C { #store = inject(Store); u = this.#store.select('users'); }`,
  ])('%s is reported', line => {
    expect(component(`${line}\n`).violations).toEqual([DIRECT]);
  });

  it('two calls in one file are one finding', () => {
    expect(
      component("this.store.select('a');\nthis.store.select('b');\n").violations
    ).toEqual([DIRECT]);
  });

  it.each([
    'this.users$ = this.store.select(selectUsers);',
    'this.users$ = this.store.select((selectUsers));',
    'this.users$ = this.store.select(fromUser.selectAll);',
    'this.user$ = this.store.select(selectUserById(id));',
    "this.user$ = this.store.select(selectById('x'));",
    'this.users$ = this.store.pipe(select(selectUsers));',
    "// was: this.store.select('users')",
    '/* this.store.select(s => s.users) */ this.store.select(selectUsers);',
    'const hint = "this.store.select(\'users\')";',
    "this.restore.select('users');",
    "this.backupRestore.select('users');",
    "this.service.store.select('users');",
    'class C { private store = inject(UsersStore); u = this.store.select(s => s.users); }',
    'class C { constructor(private store: UsersStore) { this.store.select(s => s.users); } }',
    "import { Store } from '@ngxs/store'; class C { store = inject(Store); u = this.store.select('users'); }",
  ])('control: %s is not reported', line => {
    expect(component(`${line}\n`).violations).toEqual([]);
  });

  it('the law reports it once, not once per analyzer', () => {
    const root = project({
      'package.json': manifest({ '@ngrx/store': '^20.0.0' }),
      'src/app/user/user.component.ts': "this.store.select('users');\n",
    });
    const result = NgRxSelectorsMemoizationMandateLaw.check({
      projectRoot: root,
      config,
    });
    expect(result.violations).toEqual([DIRECT]);
    expect(result.passed).toBe(false);
    expect(result.notRead).toBeUndefined();
  });

  describe('a component that cannot be read is said, not judged as text', () => {
    const law = (content: string) =>
      NgRxSelectorsMemoizationMandateLaw.check({
        projectRoot: project({
          'package.json': manifest({ '@ngrx/store': '^20.0.0' }),
          'src/app/user/user.component.ts': content,
        }),
        config,
      });
    afterEach(() => jest.restoreAllMocks());

    it('no TypeScript: notRead, not passed, no finding', () => {
      jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      const result = law("this.store.select('users');\n");
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(false);
      expect(result.notRead).toEqual([
        expect.stringContaining(
          'the store.select calls of 1 component file(s) were NOT read'
        ),
      ]);
    });

    it('a file with syntax errors: notRead names it', () => {
      const result = law("this.store.select('users'\n");
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(false);
      expect(result.notRead).toEqual([
        expect.stringMatching(
          /user\.component\.ts: could not be parsed — its store\.select calls were NOT read$/
        ),
      ]);
    });

    it('control: no TypeScript and no .select call in any component: nothing to read', () => {
      jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      const result = law('export class UserComponent {}\n');
      expect(result.notRead).toBeUndefined();
      expect(result.passed).toBe(true);
    });
  });
});

const naming = (files: Record<string, string>) =>
  NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
    project(files),
    config
  );

describe('#612 point 11: a lower-case feature folder does not set the case of names', () => {
  it("'[User] Load Users' has the feature prefix of folder user", () => {
    const result = naming({
      [`${STATE}/user.actions.ts`]:
        "export const loadUsers = createAction('[User] Load Users');\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('UserEffects is the effects class name', () => {
    const result = naming({
      [`${STATE}/user.effects.ts`]:
        'export class UserEffects { load$ = createEffect(() => x); }\n',
    });
    expect(result.suggestions).toEqual([]);
  });

  it('selectUserFeature / initialUserState are the expected names', () => {
    const result = naming({
      [`${STATE}/user.selectors.ts`]:
        "export const selectUserFeature = createFeatureSelector('user');\n",
      [`${STATE}/user.reducer.ts`]:
        'export const initialState: UserState = {};\nexport const initialUserState = initialState;\n',
    });
    expect(result.suggestions).toEqual([]);
  });

  it('a kebab-case folder maps to PascalCase names', () => {
    const result = naming({
      'src/app/user-profile/+state/user-profile.actions.ts':
        "export const load = createAction('[User Profile] Load');\n",
      'src/app/user-profile/+state/user-profile.effects.ts':
        'export class UserProfileEffects { load$ = createEffect(() => x); }\n',
    });
    expect(result).toEqual({ violations: [], suggestions: [] });
  });

  it('control: another feature prefix and class name are still reported, in PascalCase', () => {
    const result = naming({
      [`${STATE}/user.actions.ts`]:
        "export const loadUsers = createAction('[Admin] Load Users');\n",
      [`${STATE}/user.effects.ts`]:
        'export class AdminEffects { load$ = createEffect(() => x); }\n',
    });
    expect(result.violations).toEqual([
      "Action '[Admin] Load Users' should start with '[User]' prefix in user.actions",
    ]);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        "Rename action to '[User] [Admin] Load Users'",
        "Effects class should be named 'UserEffects' in user.effects",
      ])
    );
  });
});

describe('#612 point 12: "Selector should start with select" fires on a selector not named select*', () => {
  it('getUsers = createSelector(...) gets the prefix suggestion', () => {
    const result = naming({
      [`${STATE}/user.selectors.ts`]:
        'export const getUsers = createSelector(selectState, s => s.users);\n',
    });
    expect(result.suggestions).toEqual([
      "Selector 'getUsers' should start with 'select' prefix in user.selectors",
    ]);
  });

  it('control: selectUsers = createSelector(...) and a non-selector const get none', () => {
    const result = naming({
      [`${STATE}/user.selectors.ts`]: [
        'export const selectUsers = createSelector(selectState, s => s.users);',
        'export const PAGE_SIZE = 20;',
      ].join('\n'),
    });
    expect(result.suggestions).toEqual([]);
  });
});
