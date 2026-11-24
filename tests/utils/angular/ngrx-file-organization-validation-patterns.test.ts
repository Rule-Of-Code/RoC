/**
 * @fileoverview Tests for ngrx-file-organization-validation-patterns.ts
 * @description Tests for NgRx File Organization Validation Patterns utility,
 * on real project fixtures: the validation finds +state directories under
 * src/ and reads what is in them, so the tests write those directories.
 */

import path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFileOrganizationConfiguration } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-configuration';
import { NgRxFileOrganizationValidationPatterns } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
    project(files),
    config
  );

const M = NgRxFileOrganizationConfiguration.getValidationMessages();
const STATE = 'src/app/user/+state';

/** A +state directory of feature `user` with the given file names. */
const state = (...names: string[]) =>
  Object.fromEntries(
    names.map(name => [`${STATE}/${name}`, 'export {};\n'])
  ) as Record<string, string>;

/** A well-organized `user` store: barrel, one file of each kind, a test. */
const WELL_ORGANIZED = state(
  'index.ts',
  'user.actions.ts',
  'user.reducer.ts',
  'user.selectors.ts',
  'user.effects.ts'
);

describe('utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns', () => {
  describe('NgRxFileOrganizationValidationPatterns', () => {
    describe('validateAllFileOrganizationPatterns', () => {
      it('should return empty results when no state directories found', () => {
        const result = validate({
          'src/app/user/user.actions.ts': 'export {};\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when there is no src directory', () => {
        const result = validate({
          'lib/user/+state/user.actions.ts': 'export {};\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate barrel exports in state directories', () => {
        const result = validate({
          ...state('user.actions.ts', 'user.reducer.ts'),
          'src/app/user/+state/user.spec.ts': 'export {};\n',
        });

        expect(result.violations).toEqual([M.MISSING_BARREL_EXPORT('user')]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([M.CREATE_BARREL_EXPORT('user')])
        );
      });

      it('should suggest file naming convention improvements', () => {
        const result = validate(state('index.ts', 'user.helpers.ts'));

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            M.IMPROPER_FILE_NAMING('user.helpers.ts', 'user'),
          ])
        );
      });

      it('should accept every standard NgRx file suffix', () => {
        const result = validate(
          state(
            'index.ts',
            'user.actions.ts',
            'user.reducer.ts',
            'user.selectors.ts',
            'user.effects.ts',
            'user.models.ts',
            'user.facade.ts',
            'user.state.ts'
          )
        );

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([M.CONSIDER_TEST_FILES('user')]);
      });

      it('should suggest adding test files when missing', () => {
        const result = validate(WELL_ORGANIZED);

        expect(result).toEqual({
          violations: [],
          suggestions: [M.CONSIDER_TEST_FILES('user')],
        });
      });

      it.each([
        [
          'action',
          ['user.actions.ts', 'user-admin.actions.ts'],
          M.MULTIPLE_ACTION_FILES,
        ],
        [
          'reducer',
          ['user.reducer.ts', 'user-admin.reducer.ts'],
          M.MULTIPLE_REDUCER_FILES,
        ],
        [
          'selector',
          ['user.selectors.ts', 'user-admin.selectors.ts'],
          M.MULTIPLE_SELECTOR_FILES,
        ],
      ])(
        'should suggest consolidating multiple %s files',
        (_kind, names, message) => {
          const result = validate(state('index.ts', ...names));

          expect(result.violations).toEqual([]);
          expect(result.suggestions).toEqual(
            expect.arrayContaining([message('user')])
          );
        }
      );

      it('should validate feature prefix in file names', () => {
        const result = validate(
          state('index.ts', 'user.actions.ts', 'auth.reducer.ts')
        );

        expect(result.suggestions).toEqual([
          M.MISSING_FEATURE_PREFIX('auth.reducer.ts', 'user'),
          M.CONSIDER_TEST_FILES('user'),
        ]);
      });

      it('should not ask the barrel to carry the feature prefix', () => {
        const result = validate(state('index.ts', 'user.actions.ts'));

        expect(result.suggestions).not.toEqual(
          expect.arrayContaining([M.MISSING_FEATURE_PREFIX('index.ts', 'user')])
        );
      });

      it('should ignore files that are not TypeScript when judging names', () => {
        const result = validate(
          state('index.ts', 'user.actions.ts', 'README.md')
        );

        expect(result.suggestions).toEqual([M.CONSIDER_TEST_FILES('user')]);
      });

      it('should validate multiple state directories', () => {
        const result = validate({
          ...state('user.actions.ts'),
          'src/app/order/+state/order.actions.ts': 'export {};\n',
          'src/app/order/+state/index.ts': 'export {};\n',
          'src/app/cart/+state/cart.actions.ts': 'export {};\n',
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            M.MISSING_BARREL_EXPORT('user'),
            M.MISSING_BARREL_EXPORT('cart'),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });

      it('should find a +state directory nested deep under src', () => {
        const result = validate({
          'src/libs/shop/feature/order/+state/order.actions.ts': 'export {};\n',
        });

        expect(result.violations).toEqual([M.MISSING_BARREL_EXPORT('order')]);
      });

      it('should judge each state directory once', () => {
        const result = validate(state('user.actions.ts'));

        // The directory is found by two searches; it is validated once.
        expect(result.violations).toEqual([M.MISSING_BARREL_EXPORT('user')]);
        expect(
          result.suggestions.filter(s => s === M.CREATE_BARREL_EXPORT('user'))
        ).toHaveLength(1);
      });
    });

    describe('processStateDirectoryComprehensive', () => {
      it('should process a single state directory with all validations', () => {
        const root = project(state('user.actions.ts', 'user.helpers.ts'));

        const result =
          NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
            path.join(root, STATE),
            config
          );

        expect(result.violations).toEqual([M.MISSING_BARREL_EXPORT('user')]);
        expect(result.suggestions).toEqual([
          M.CREATE_BARREL_EXPORT('user'),
          M.IMPROPER_FILE_NAMING('user.helpers.ts', 'user'),
          M.CONSIDER_TEST_FILES('user'),
        ]);
      });

      it('should return empty results for valid state directory', () => {
        const root = project({
          ...WELL_ORGANIZED,
          'src/app/user/+state/user.spec.ts': 'export {};\n',
        });

        const result =
          NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
            path.join(root, STATE),
            config
          );

        expect(result.violations).toEqual([]);
      });
    });
  });
});
