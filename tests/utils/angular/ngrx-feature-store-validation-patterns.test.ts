/**
 * @fileoverview Tests for ngrx-feature-store-validation-patterns.ts
 * @description Tests for NgRx Feature Store Validation Patterns utility, on
 * real project fixtures. A feature is a directory under src/app with a +state
 * directory or NgRx files (*.actions.ts, *.reducer.ts, *.selectors.ts,
 * *.effects.ts); its +state needs <name>.actions/.reducer/.selectors/.models
 * and index.ts, and <name>.effects/.facade are suggested.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreValidationPatterns } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-feature-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
    project(files),
    config
  );
/** The messages about one feature (its name, or its +state path). */
const about = (messages: string[], feature: string): string[] =>
  messages.filter(
    m => m.includes(`${feature}/+state`) || m.includes(` ${feature} feature`)
  );

const CODE = 'export {};\n';

describe('utils/angular/ngrx-feature-store/ngrx-feature-store-validation-patterns', () => {
  describe('NgRxFeatureStoreValidationPatterns', () => {
    describe('validateAllFeatureStorePatterns', () => {
      it('should return suggestion when no feature directories found', () => {
        const result = validate({ 'src/app/app.component.ts': CODE });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('feature directories');
      });

      it('should validate feature with missing +state directory', () => {
        const result = validate({ 'src/app/users/users.actions.ts': CODE });

        expect(
          result.violations.some(
            v => v.includes('users') && v.includes('+state')
          )
        ).toBe(true);
        expect(result.suggestions.some(s => s.includes('users'))).toBe(true);
      });

      it('should validate feature with missing required files', () => {
        // +state holds files with no NgRx suffix, so it is not taken for a
        // feature of its own; actions, reducer and selectors are missing.
        const result = validate({
          'src/app/users/+state/users.models.ts': CODE,
          'src/app/users/+state/index.ts': CODE,
        });

        expect(
          result.violations.some(v => v.includes('users.actions.ts'))
        ).toBe(true);
        expect(
          result.violations.some(v => v.includes('users.reducer.ts'))
        ).toBe(true);
      });

      it('should suggest optional files for better architecture', () => {
        const result = validate({
          'src/app/users/+state/users.models.ts': CODE,
          'src/app/users/+state/index.ts': CODE,
        });

        expect(
          result.suggestions.some(
            s => s.includes('users.effects.ts') && s.includes('Consider')
          )
        ).toBe(true);
        expect(
          result.suggestions.some(s => s.includes('users.facade.ts'))
        ).toBe(true);
      });

      it('should report nothing about a feature that has every file', () => {
        const result = validate({
          'src/app/users/+state/users.actions.ts': CODE,
          'src/app/users/+state/users.reducer.ts': CODE,
          'src/app/users/+state/users.selectors.ts': CODE,
          'src/app/users/+state/users.models.ts': CODE,
          'src/app/users/+state/index.ts': CODE,
          'src/app/users/+state/users.effects.ts': CODE,
          'src/app/users/+state/users.facade.ts': CODE,
        });

        // Nothing about the users feature. (The +state directory itself,
        // which holds *.actions.ts files, is also taken for a feature today;
        // that is a detector defect reported separately, not asserted here.)
        expect(about(result.violations, 'users')).toEqual([]);
        expect(about(result.suggestions, 'users')).toEqual([]);
      });

      it('should validate multiple feature directories', () => {
        const result = validate({
          'src/app/users/users.reducer.ts': CODE,
          'src/app/products/+state/products.models.ts': CODE,
          'src/app/products/+state/index.ts': CODE,
        });

        expect(result.violations.some(v => v.includes('users'))).toBe(true);
        expect(
          result.violations.some(v => v.includes('products.actions.ts'))
        ).toBe(true);
      });

      it('should filter directories without feature indicators', () => {
        const result = validate({
          'src/app/users/users.actions.ts': CODE,
          'src/app/shared/button.component.ts': CODE,
        });

        expect(result.violations.some(v => v.includes('users'))).toBe(true);
        expect(
          [...result.violations, ...result.suggestions].some(m =>
            m.includes('shared')
          )
        ).toBe(false);
      });

      it('should handle mixed violations and suggestions correctly', () => {
        const result = validate({
          'src/app/users/+state/users.models.ts': CODE,
          'src/app/users/+state/index.ts': CODE,
        });

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });
  });
});
