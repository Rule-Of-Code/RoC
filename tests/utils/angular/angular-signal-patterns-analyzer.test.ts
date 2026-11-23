/**
 * @fileoverview Tests for angular-signal-patterns-analyzer.ts
 * @description Tests for Angular Signal Patterns Analyzer utility, on real
 * project fixtures: the analyzer finds *.component.ts / *.service.ts files
 * under src/ and reads them, so the tests write them. A spy that only
 * observes AngularSignalValidationPatterns checks the delegation.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalConfiguration } from '../../../src/utils/angular/angular-signals/angular-signal-configuration';
import { AngularSignalPatternsAnalyzer } from '../../../src/utils/angular/angular-signals/angular-signal-patterns-analyzer';
import { AngularSignalValidationPatterns } from '../../../src/utils/angular/angular-signals/angular-signal-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});
afterEach(() => {
  jest.restoreAllMocks();
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ng-signals-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const check = (files: Record<string, string>) =>
  AngularSignalPatternsAnalyzer.checkSignalPatterns(project(files), config);

const MESSAGES = AngularSignalConfiguration.VALIDATION_MESSAGES;
const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A message from `template` about `file` (named by base name or by path). */
const about = (template: string, file: string) =>
  expect.stringMatching(
    new RegExp(
      `^${escape(template.replace('{fileName}', ''))}.*${escape(file)}$`
    )
  );

const COMPONENT = 'src/app/app.component.ts';

describe('utils/angular/angular-signals/angular-signal-patterns-analyzer', () => {
  describe('AngularSignalPatternsAnalyzer', () => {
    describe('checkSignalPatterns', () => {
      it('should return empty results when src directory does not exist', () => {
        const result = check({ 'lib/app.component.ts': 'signal();\n' });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty results when no Angular files found', () => {
        const result = check({
          'src/app/util.ts': 'const count = signal();\n',
        });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect signal pattern violations in component files', () => {
        const result = check({ [COMPONENT]: 'const count = signal();\n' });

        expect(result.violations).toEqual([
          about(
            MESSAGES.SIGNAL_WITHOUT_VALUE.violationMessage,
            'app.component.ts'
          ),
        ]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            about(
              MESSAGES.SIGNAL_WITHOUT_VALUE.suggestionMessage,
              'app.component.ts'
            ),
          ])
        );
      });

      it('should detect properly initialized signals', () => {
        const result = check({
          [COMPONENT]: `
            import { signal, WritableSignal } from '@angular/core';
            readonly count: WritableSignal<number> = signal<number>(0);
            readonly total = signal(0);
          `,
        });

        expect(result.violations).toEqual([]);
        // Readonly and explicitly typed: neither suggestion is made.
        expect(result.suggestions).toEqual([]);
      });

      it('should process multiple files', () => {
        const result = check({
          [COMPONENT]: 'const count = signal();\n',
          'src/app/data.service.ts': 'const items = signal();\n',
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            about(
              MESSAGES.SIGNAL_WITHOUT_VALUE.violationMessage,
              'app.component.ts'
            ),
            about(
              MESSAGES.SIGNAL_WITHOUT_VALUE.violationMessage,
              'data.service.ts'
            ),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });

      it('should handle empty file content', () => {
        const result = check({ 'src/app/empty.component.ts': '' });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect computed signals with side effects as violations', () => {
        const result = check({
          [COMPONENT]: `
            readonly double = computed(() => { console.log('side effect'); return count() * 2; });
          `,
        });

        expect(result.violations).toEqual([
          about(
            MESSAGES.COMPUTED_WITH_SIDE_EFFECTS.violationMessage,
            'app.component.ts'
          ),
        ]);
      });

      it('should detect effect without cleanup', () => {
        const withoutCleanup = check({
          [COMPONENT]: 'effect(() => { console.log(count()); });\n',
        });
        const withCleanup = check({
          [COMPONENT]:
            'destroyRef = inject(DestroyRef);\neffect(() => { console.log(count()); });\n',
        });

        const cleanup = about(
          MESSAGES.EFFECT_WITHOUT_CLEANUP.suggestionMessage,
          'app.component.ts'
        );
        expect(withoutCleanup.suggestions).toEqual(
          expect.arrayContaining([cleanup])
        );
        expect(withCleanup.suggestions).not.toEqual(
          expect.arrayContaining([cleanup])
        );
      });

      it('should detect inconsistent update patterns', () => {
        const mixed = check({
          [COMPONENT]: `
            readonly count = signal(0);
            count.set(5);
            count.update(v => v + 1);
          `,
        });
        const setOnly = check({
          [COMPONENT]: `
            readonly count = signal(0);
            count.set(5);
          `,
        });

        const inconsistent = about(
          MESSAGES.INCONSISTENT_UPDATE_PATTERN.suggestionMessage,
          'app.component.ts'
        );
        expect(mixed.suggestions).toEqual(
          expect.arrayContaining([inconsistent])
        );
        expect(setOnly.suggestions).not.toEqual(
          expect.arrayContaining([inconsistent])
        );
      });

      it('should use correct file extensions from configuration', () => {
        const extensions = AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS;
        expect(extensions).toContain('.component.ts');
        expect(extensions).toContain('.service.ts');
      });
    });

    describe('integration with AngularSignalValidationPatterns', () => {
      it('should call validateAllPatterns for file analysis', () => {
        const content = 'const count = signal(0);\n';
        const validate = jest.spyOn(
          AngularSignalValidationPatterns,
          'validateAllPatterns'
        );

        check({ [COMPONENT]: content });

        expect(validate).toHaveBeenCalledTimes(1);
        expect(validate).toHaveBeenCalledWith(
          expect.objectContaining({ hasSignal: true }),
          expect.any(Array),
          expect.any(Array),
          content,
          config
        );
      });
    });
  });
});
