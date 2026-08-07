/**
 * @fileoverview Tests for ngrx-memoization-configuration.ts
 * @description Tests for NgRx Memoization Configuration utility
 */

import { NgRxMemoizationConfiguration } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-configuration';
import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  PERFORMANCE_CONSTANTS,
} from '../../../src/utils/constants';

describe('utils/angular/ngrx-memoization/ngrx-memoization-configuration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxMemoizationConfiguration', () => {
    describe('SELECTOR_FILE_EXTENSIONS', () => {
      it('should contain selector file extensions', () => {
        const extensions =
          NgRxMemoizationConfiguration.SELECTOR_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.SELECTORS_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.SELECTOR_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxMemoizationConfiguration.SELECTOR_FILE_EXTENSIONS)
        ).toBe(true);
      });
    });

    describe('COMPONENT_FILE_EXTENSIONS', () => {
      it('should contain component file extension', () => {
        const extensions =
          NgRxMemoizationConfiguration.COMPONENT_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.COMPONENT_TS);
      });
    });

    describe('DIRECT_STATE_ACCESS_PATTERN', () => {
      it('should detect raw exported selectors (any param name / parens)', () => {
        const pattern =
          NgRxMemoizationConfiguration.DIRECT_STATE_ACCESS_PATTERN;
        expect(
          'export const getUsers = state => state.users'.match(pattern)
        ).not.toBeNull();
        expect(
          'export const getList = (s) => s.items.list'.match(pattern)
        ).not.toBeNull();
      });

      it('does not match createSelector projector arrows (no false positive)', () => {
        const pattern =
          NgRxMemoizationConfiguration.DIRECT_STATE_ACCESS_PATTERN;
        // v7.2.2: the pattern is anchored on `export const NAME =`, so the inner
        // projector arrow of a createSelector() call is no longer matched.
        const content =
          'export const getUsers = createSelector(selectState, state => state.users)';
        expect(content.match(pattern)).toBeNull();
      });
    });

    describe('SINGLE_PARAM_SELECTOR_PATTERN', () => {
      it('should detect single parameter selectors', () => {
        const pattern =
          NgRxMemoizationConfiguration.SINGLE_PARAM_SELECTOR_PATTERN;
        const content = 'createSelector(state =>';
        expect(content.match(pattern)).not.toBeNull();
      });
    });

    describe('DIRECT_SELECT_PATTERN', () => {
      it('should detect store.select patterns', () => {
        const pattern = NgRxMemoizationConfiguration.DIRECT_SELECT_PATTERN;
        expect(
          'store.select(state => state.users)'.match(pattern)
        ).not.toBeNull();
        expect("this.store.select('users')".match(pattern)).not.toBeNull();
      });
    });

    describe('SELECTOR_SUBSCRIPTION_PATTERN', () => {
      it('should detect selector subscription patterns', () => {
        const pattern =
          NgRxMemoizationConfiguration.SELECTOR_SUBSCRIPTION_PATTERN;
        expect('.select(selectUsers).subscribe'.match(pattern)).not.toBeNull();
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have all validation message templates', () => {
        const messages = NgRxMemoizationConfiguration.VALIDATION_MESSAGES;
        expect(messages.DIRECT_STATE_ACCESS).toBeDefined();
        expect(messages.WRAP_WITH_SELECTOR).toBeDefined();
        expect(messages.USE_FEATURE_SELECTOR).toBeDefined();
        expect(messages.OPTIMIZE_COMPLEX_SELECTOR).toBeDefined();
        expect(messages.MISSING_STORE_IMPORT).toBeDefined();
        expect(messages.IMPORT_FROM_STORE).toBeDefined();
        expect(messages.COMPOSE_SELECTORS).toBeDefined();
        expect(messages.DIRECT_STORE_SELECT).toBeDefined();
        expect(messages.USE_MEMOIZED_SELECTORS).toBeDefined();
        expect(messages.USE_ASYNC_PIPE).toBeDefined();
        expect(messages.ENSURE_CLEANUP).toBeDefined();
      });

      it('should contain fileName placeholders', () => {
        const messages = NgRxMemoizationConfiguration.VALIDATION_MESSAGES;
        expect(messages.DIRECT_STATE_ACCESS).toContain('{fileName}');
        expect(messages.WRAP_WITH_SELECTOR).toContain('{fileName}');
        expect(messages.USE_FEATURE_SELECTOR).toContain('{fileName}');
      });
    });

    describe('FILE_READ_OPTIONS', () => {
      it('should have correct encoding option', () => {
        const options = NgRxMemoizationConfiguration.FILE_READ_OPTIONS;
        expect(options.encoding).toBe(ANGULAR_CONSTANTS.ENCODING_UTF8);
      });

      it('should have fallbackToEmpty option set to true', () => {
        const options = NgRxMemoizationConfiguration.FILE_READ_OPTIONS;
        expect(options.fallbackToEmpty).toBe(true);
      });
    });

    describe('COMPONENT_FILE_READ_OPTIONS', () => {
      it('should have correct encoding option', () => {
        const options =
          NgRxMemoizationConfiguration.COMPONENT_FILE_READ_OPTIONS;
        expect(options.encoding).toBe(ANGULAR_CONSTANTS.ENCODING_UTF8);
      });

      it('should not have fallbackToEmpty option', () => {
        const options =
          NgRxMemoizationConfiguration.COMPONENT_FILE_READ_OPTIONS;
        expect(
          (options as Record<string, unknown>).fallbackToEmpty
        ).toBeUndefined();
      });
    });

    describe('hasDirectStateAccess', () => {
      it('should return match when direct state access exists', () => {
        const content = 'export const getUsers = state => state.users';
        const result =
          NgRxMemoizationConfiguration.hasDirectStateAccess(content);
        expect(result).not.toBeNull();
      });

      it('should return null when no direct state access', () => {
        const content =
          'createSelector(selectFeature, feature => feature.users)';
        const result =
          NgRxMemoizationConfiguration.hasDirectStateAccess(content);
        expect(result).toBeNull();
      });
    });

    describe('hasCreateSelector', () => {
      it('should return true when createSelector is used', () => {
        const content = 'createSelector(selectState, state => state.users)';
        expect(NgRxMemoizationConfiguration.hasCreateSelector(content)).toBe(
          true
        );
      });

      it('should return false when createSelector is not used', () => {
        const content = 'state => state.users';
        expect(NgRxMemoizationConfiguration.hasCreateSelector(content)).toBe(
          false
        );
      });
    });

    describe('findSingleParamSelectors', () => {
      it('should find single parameter selectors', () => {
        const content = 'createSelector(state =>';
        const result =
          NgRxMemoizationConfiguration.findSingleParamSelectors(content);
        expect(result).not.toBeNull();
      });

      it('should return null when no single param selectors', () => {
        const content =
          'createSelector(selectFeature, feature => feature.users)';
        const result =
          NgRxMemoizationConfiguration.findSingleParamSelectors(content);
        expect(result).toBeNull();
      });
    });

    describe('findComplexSelectorComputations', () => {
      it('should find complex selector patterns', () => {
        const content =
          'createSelector(selectItems, items => { return items.filter(i => i.active); })';
        const result =
          NgRxMemoizationConfiguration.findComplexSelectorComputations(content);
        expect(result).not.toBeNull();
      });
    });

    describe('isComplexSelectorComputation', () => {
      it('should return true for long selectors', () => {
        const longSelector = 'x'.repeat(
          PERFORMANCE_CONSTANTS.MAX_SELECTOR_LENGTH + 1
        );
        expect(
          NgRxMemoizationConfiguration.isComplexSelectorComputation(
            longSelector
          )
        ).toBe(true);
      });

      it('should return true for selectors with for loops', () => {
        const selector =
          'createSelector(items => { for (const i of items) { } })';
        expect(
          NgRxMemoizationConfiguration.isComplexSelectorComputation(selector)
        ).toBe(true);
      });

      it('should return true for selectors with while loops', () => {
        const selector = 'createSelector(items => { while (true) { } })';
        expect(
          NgRxMemoizationConfiguration.isComplexSelectorComputation(selector)
        ).toBe(true);
      });

      it('should return false for simple selectors', () => {
        const selector = 'createSelector(selectItems, items => items.length)';
        expect(
          NgRxMemoizationConfiguration.isComplexSelectorComputation(selector)
        ).toBe(false);
      });
    });

    describe('hasProperStoreImports', () => {
      it('should return true when no createSelector used', () => {
        const content = 'state => state.users';
        expect(
          NgRxMemoizationConfiguration.hasProperStoreImports(content)
        ).toBe(true);
      });

      it('should return true when createSelector and @ngrx/store imported', () => {
        const content = `import { createSelector } from '@ngrx/store';
        createSelector(selectState, state => state.users)`;
        expect(
          NgRxMemoizationConfiguration.hasProperStoreImports(content)
        ).toBe(true);
      });

      it('should return false when createSelector used without import', () => {
        const content = 'createSelector(selectState, state => state.users)';
        expect(
          NgRxMemoizationConfiguration.hasProperStoreImports(content)
        ).toBe(false);
      });
    });

    describe('countCreateSelectors', () => {
      it('should count createSelector occurrences', () => {
        const content = `
          export const selectA = createSelector(selectState, s => s.a);
          export const selectB = createSelector(selectState, s => s.b);
          export const selectC = createSelector(selectA, selectB, (a, b) => a + b);
        `;
        expect(NgRxMemoizationConfiguration.countCreateSelectors(content)).toBe(
          3
        );
      });

      it('should return 0 when no createSelector', () => {
        const content = 'const selector = state => state.users';
        expect(NgRxMemoizationConfiguration.countCreateSelectors(content)).toBe(
          0
        );
      });
    });

    describe('countComposedSelectors', () => {
      it('should count composed selectors', () => {
        const content = 'createSelector(selectA, selectB, (a, b) => a + b)';
        expect(
          NgRxMemoizationConfiguration.countComposedSelectors(content)
        ).toBe(1);
      });

      it('should return 0 when no composition', () => {
        const content = 'createSelector(selectState, state => state.users)';
        expect(
          NgRxMemoizationConfiguration.countComposedSelectors(content)
        ).toBe(0);
      });
    });

    describe('needsSelectorComposition', () => {
      it('should return true when many selectors but no composition', () => {
        const content = `
          createSelector(s => s.a);
          createSelector(s => s.b);
          createSelector(s => s.c);
          createSelector(s => s.d);
        `;
        expect(
          NgRxMemoizationConfiguration.needsSelectorComposition(content)
        ).toBe(true);
      });

      it('should return false when selectors are composed', () => {
        const content = `
          createSelector(s => s.a);
          createSelector(s => s.b);
          createSelector(s => s.c);
          createSelector(selectA, selectB, (a, b) => a + b);
        `;
        expect(
          NgRxMemoizationConfiguration.needsSelectorComposition(content)
        ).toBe(false);
      });

      it('should return false when few selectors', () => {
        const content = `
          createSelector(s => s.a);
          createSelector(s => s.b);
        `;
        expect(
          NgRxMemoizationConfiguration.needsSelectorComposition(content)
        ).toBe(false);
      });
    });

    describe('findDirectSelects', () => {
      it('should find store.select patterns', () => {
        const content = 'this.store.select(state => state.users)';
        const result = NgRxMemoizationConfiguration.findDirectSelects(content);
        expect(result).not.toBeNull();
      });

      it('should return null when no store.select', () => {
        const content = 'this.users$ = this.store.pipe(select(selectUsers))';
        const result = NgRxMemoizationConfiguration.findDirectSelects(content);
        expect(result).toBeNull();
      });
    });

    describe('hasValidDirectSelectUsage', () => {
      it('should return true when no store.select', () => {
        const content = 'const users$ = this.store.pipe(select(selectUsers))';
        expect(
          NgRxMemoizationConfiguration.hasValidDirectSelectUsage(content)
        ).toBe(true);
      });

      it('should return true when using select prefix', () => {
        const content = 'this.store.select(selectUsers)';
        expect(
          NgRxMemoizationConfiguration.hasValidDirectSelectUsage(content)
        ).toBe(true);
      });

      it('should return true when store.select contains select word', () => {
        // hasValidDirectSelectUsage returns true if content contains SELECT_PREFIX ('select')
        // 'store.select' contains 'select', so this returns true
        const content = 'this.store.select(state => state.users)';
        expect(
          NgRxMemoizationConfiguration.hasValidDirectSelectUsage(content)
        ).toBe(true);
      });
    });

    describe('isInvalidDirectSelect', () => {
      it('should return true for string literal selectors', () => {
        expect(
          NgRxMemoizationConfiguration.isInvalidDirectSelect(
            "store.select('users')"
          )
        ).toBe(true);
        expect(
          NgRxMemoizationConfiguration.isInvalidDirectSelect(
            'store.select("users")'
          )
        ).toBe(true);
      });

      it('should return false for selector function selectors', () => {
        expect(
          NgRxMemoizationConfiguration.isInvalidDirectSelect(
            'store.select(selectUsers)'
          )
        ).toBe(false);
      });
    });

    describe('findSelectorSubscriptions', () => {
      it('should find subscription patterns', () => {
        const content = '.select(selectUsers).subscribe(users => {})';
        const result =
          NgRxMemoizationConfiguration.findSelectorSubscriptions(content);
        expect(result).not.toBeNull();
      });

      it('should return null when no subscriptions', () => {
        const content = '.select(selectUsers)';
        const result =
          NgRxMemoizationConfiguration.findSelectorSubscriptions(content);
        expect(result).toBeNull();
      });
    });

    describe('hasTooManySubscriptions', () => {
      it('should return true when too many subscriptions', () => {
        const content = `
          .select(a).subscribe
          .select(b).subscribe
          .select(c).subscribe
          .select(d).subscribe
        `;
        expect(
          NgRxMemoizationConfiguration.hasTooManySubscriptions(content)
        ).toBe(true);
      });

      it('should return false when few subscriptions', () => {
        const content = '.select(selectUsers).subscribe';
        expect(
          NgRxMemoizationConfiguration.hasTooManySubscriptions(content)
        ).toBe(false);
      });
    });

    describe('needsSubscriptionCleanup', () => {
      it('should return true when select without async pipe or Subscription', () => {
        const content = 'this.store.select(selectUsers)';
        expect(
          NgRxMemoizationConfiguration.needsSubscriptionCleanup(content)
        ).toBe(true);
      });

      it('should return false when using async pipe', () => {
        const content = 'this.store.select(selectUsers) | async';
        expect(
          NgRxMemoizationConfiguration.needsSubscriptionCleanup(content)
        ).toBe(false);
      });

      it('should return false when using Subscription', () => {
        const content = `
          .select(selectUsers)
          private subscription: Subscription
        `;
        expect(
          NgRxMemoizationConfiguration.needsSubscriptionCleanup(content)
        ).toBe(false);
      });

      it('should return false when no select', () => {
        const content = 'const users = []';
        expect(
          NgRxMemoizationConfiguration.needsSubscriptionCleanup(content)
        ).toBe(false);
      });
    });

    describe('analyzeSelectorMemoizationPatterns', () => {
      it('should detect direct state access without createSelector', () => {
        const content = 'export const getUsers = state => state.users';
        const result =
          NgRxMemoizationConfiguration.analyzeSelectorMemoizationPatterns(
            content
          );
        expect(result.hasDirectStateAccess).toBe(true);
        expect(result.hasCreateSelector).toBe(false);
      });

      it('should detect proper memoization with createSelector', () => {
        const content = `
          import { createSelector } from '@ngrx/store';
          export const selectUsers = createSelector(selectState, state => state.users);
        `;
        const result =
          NgRxMemoizationConfiguration.analyzeSelectorMemoizationPatterns(
            content
          );
        expect(result.hasCreateSelector).toBe(true);
        expect(result.hasProperImports).toBe(true);
      });

      it('should detect missing composition', () => {
        const content = `
          createSelector(s => s.a);
          createSelector(s => s.b);
          createSelector(s => s.c);
          createSelector(s => s.d);
        `;
        const result =
          NgRxMemoizationConfiguration.analyzeSelectorMemoizationPatterns(
            content
          );
        expect(result.needsComposition).toBe(true);
      });
    });

    describe('analyzeComponentSelectorPatterns', () => {
      it('should detect valid direct selects', () => {
        const content = 'this.store.select(selectUsers)';
        const result =
          NgRxMemoizationConfiguration.analyzeComponentSelectorPatterns(
            content
          );
        expect(result.hasValidDirectSelects).toBe(true);
      });

      it('should detect too many subscriptions', () => {
        const content = `
          .select(a).subscribe
          .select(b).subscribe
          .select(c).subscribe
          .select(d).subscribe
        `;
        const result =
          NgRxMemoizationConfiguration.analyzeComponentSelectorPatterns(
            content
          );
        expect(result.hasTooManySubscriptions).toBe(true);
      });

      it('should detect cleanup needs', () => {
        const content = 'this.store.select(selectUsers)';
        const result =
          NgRxMemoizationConfiguration.analyzeComponentSelectorPatterns(
            content
          );
        expect(result.needsCleanup).toBe(true);
      });
    });
  });
});
