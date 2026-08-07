/**
 * @fileoverview Tests for ngrx-effect-patterns-configuration.ts
 * @description Tests for NgRx effect patterns configuration utilities
 */

import { NgRxEffectPatternsConfiguration } from '../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-effect-patterns-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('EFFECT_PATTERNS', () => {
    it('should have KEYWORDS', () => {
      expect(
        NgRxEffectPatternsConfiguration.EFFECT_PATTERNS.KEYWORDS
      ).toBeDefined();
    });

    it('should have FILE_EXTENSIONS', () => {
      expect(
        NgRxEffectPatternsConfiguration.EFFECT_PATTERNS.FILE_EXTENSIONS
      ).toBeDefined();
    });

    it('should have ANGULAR_CONSTANTS', () => {
      expect(
        NgRxEffectPatternsConfiguration.EFFECT_PATTERNS.ANGULAR_CONSTANTS
      ).toBeDefined();
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have MISSING_INJECTABLE_VIOLATION with placeholder', () => {
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .MISSING_INJECTABLE_VIOLATION
      ).toContain('{fileName}');
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .MISSING_INJECTABLE_VIOLATION
      ).toContain('@Injectable');
    });

    it('should have USE_CREATE_EFFECT_SUGGESTION', () => {
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .USE_CREATE_EFFECT_SUGGESTION
      ).toContain('createEffect');
    });

    it('should have TAP_WITH_DISPATCH_FALSE_SUGGESTION', () => {
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .TAP_WITH_DISPATCH_FALSE_SUGGESTION
      ).toContain('dispatch: false');
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .TAP_WITH_DISPATCH_FALSE_SUGGESTION
      ).toContain('tap');
    });

    it('should have MISSING_ERROR_HANDLING_VIOLATION with placeholder', () => {
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .MISSING_ERROR_HANDLING_VIOLATION
      ).toContain('{fileName}');
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .MISSING_ERROR_HANDLING_VIOLATION
      ).toContain('error handling');
    });

    it('should have USE_INJECT_SUGGESTION', () => {
      expect(
        NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES
          .USE_INJECT_SUGGESTION
      ).toContain('inject');
    });
  });

  describe('analyzeEffectPatterns', () => {
    it('should detect @Injectable decorator', () => {
      const content = `
        @Injectable()
        export class ItemsEffects {}
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasInjectable).toBe(true);
    });

    it('should detect createEffect usage', () => {
      const content = `
        loadItems$ = createEffect(() =>
          this.actions$.pipe(
            ofType(loadItems),
            switchMap(() => this.itemsService.getItems())
          )
        );
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasCreateEffect).toBe(true);
    });

    it('should detect dispatch: false', () => {
      const content = `
        logAction$ = createEffect(() =>
          this.actions$.pipe(
            tap(action => console.log(action))
          ),
          { dispatch: false }
        );
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasDispatchFalse).toBe(true);
    });

    it('should detect tap operator', () => {
      const content = `
        tap(data => console.log(data))
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasTap).toBe(true);
    });

    it('should detect catchError operator', () => {
      const content = `
        catchError(error => of(loadItemsFailure({ error })))
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasCatchError).toBe(true);
    });

    it('should detect HTTP usage', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasHttp).toBe(true);
    });

    it('should detect inject function', () => {
      const content = `
        private readonly actions$ = inject(Actions);
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasInject).toBe(true);
    });

    it('should analyze complete effect file', () => {
      const content = `
        @Injectable()
        export class ItemsEffects {
          private readonly actions$ = inject(Actions);
          private readonly http = inject(HttpClient);

          loadItems$ = createEffect(() =>
            this.actions$.pipe(
              ofType(loadItems),
              switchMap(() =>
                this.http.get('/api/items').pipe(
                  map(items => loadItemsSuccess({ items })),
                  catchError(error => of(loadItemsFailure({ error })))
                )
              )
            )
          );

          logItems$ = createEffect(() =>
            this.actions$.pipe(
              ofType(loadItemsSuccess),
              tap(action => console.log(action))
            ),
            { dispatch: false }
          );
        }
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasInjectable).toBe(true);
      expect(result.hasCreateEffect).toBe(true);
      expect(result.hasDispatchFalse).toBe(true);
      expect(result.hasTap).toBe(true);
      expect(result.hasCatchError).toBe(true);
      expect(result.hasHttp).toBe(true);
      expect(result.hasInject).toBe(true);
    });

    it('should return false for content without effects', () => {
      const content = `
        export class SimpleService {
          getData() {
            return [];
          }
        }
      `;
      const result =
        NgRxEffectPatternsConfiguration.analyzeEffectPatterns(content);

      expect(result.hasInjectable).toBe(false);
      expect(result.hasCreateEffect).toBe(false);
      expect(result.hasDispatchFalse).toBe(false);
      expect(result.hasTap).toBe(false);
      expect(result.hasCatchError).toBe(false);
      expect(result.hasHttp).toBe(false);
      expect(result.hasInject).toBe(false);
    });
  });

  describe('isEffectFile', () => {
    it('should return true for .effects.ts files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.effects.ts')
      ).toBe(true);
    });

    it('should return true for .effect.ts files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.effect.ts')
      ).toBe(true);
    });

    it('should return true for files containing effects in name', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('user-effects.ts')
      ).toBe(true);
    });

    it('should return false for reducer files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.reducer.ts')
      ).toBe(false);
    });

    it('should return false for actions files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.actions.ts')
      ).toBe(false);
    });

    it('should return false for component files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.component.ts')
      ).toBe(false);
    });

    it('should return false for service files', () => {
      expect(
        NgRxEffectPatternsConfiguration.isEffectFile('items.service.ts')
      ).toBe(false);
    });
  });
});
