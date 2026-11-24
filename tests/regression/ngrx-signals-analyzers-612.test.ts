/**
 * #612 — the Angular Signals and NgRx analyzers reported things that are not
 * there, and held two checks that could never report.
 *
 * Every point runs the analyzer the law calls on a real temporary project
 * (no mocks of the analyzer under test). Each false finding has a control
 * next to it: the real defect is still reported.
 */
import path from 'path';
import { AngularSignalImportsAnalyzer } from '../../src/utils/angular/angular-signal-imports/angular-signal-imports-analyzer';
import { NgRxEffectPatternsValidation } from '../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { NgRxErrorHandlingValidationPatterns } from '../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { FileUtils } from '../../src/utils/file-utils';
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
