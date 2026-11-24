/**
 * @fileoverview Tests for angular-signal-usage-analyzer.ts
 * @description Tests for Angular Signal Usage Analyzer utility, on real
 * project fixtures: the analyzer finds *.component.ts files under src/ (and
 * unsuffixed components by their decorator), reads each one and the
 * .component.html next to it, so the tests write those files.
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalUsageAnalyzer } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-analyzer';
import { AngularSignalUsageConfiguration } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-configuration';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const check = (files: Record<string, string>) =>
  AngularSignalUsageAnalyzer.checkSignalUsage(project(files), config);

const M = AngularSignalUsageConfiguration.VALIDATION_MESSAGES;
const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A suggestion from `template` about `file` (named by base name or by path). */
const about = (
  template: { suggestionMessage: string },
  file = 'app.component.ts'
) =>
  expect.stringMatching(
    new RegExp(
      `^${escape(template.suggestionMessage.replace('{fileName}', ''))}.*${escape(file)}$`
    )
  );

const COMPONENT = 'src/app/app.component.ts';
const TEMPLATE = 'src/app/app.component.html';

describe('utils/angular/angular-signal-usage/angular-signal-usage-analyzer', () => {
  describe('AngularSignalUsageAnalyzer', () => {
    describe('checkSignalUsage', () => {
      it('should return empty results when src directory does not exist', () => {
        const result = check({
          'lib/app.component.ts': 'data$ = new BehaviorSubject(0);\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when no component files found', () => {
        const result = check({
          'src/app/data.service.ts': 'data$ = new BehaviorSubject(0);\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should suggest migrating from BehaviorSubject to signals', () => {
        const result = check({
          [COMPONENT]: `data$ = new BehaviorSubject<string>('');\n`,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          about(M.CONSIDER_SUBJECT_MIGRATION),
        ]);
      });

      it('should suggest migrating from Subject to signals', () => {
        const result = check({
          [COMPONENT]: `destroy$ = new Subject<void>();\n`,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_SUBJECT_MIGRATION),
        ]);
      });

      it('should not suggest Subject migration when signals are already used', () => {
        const result = check({
          [COMPONENT]: `
            destroy$ = new Subject<void>();
            count = signal(0);
          `,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should suggest using signals for FormControl', () => {
        const result = check({
          [COMPONENT]: `name = new FormControl('');\n`,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_REACTIVE_FORMS_MIGRATION),
        ]);
      });

      it('should suggest signals for component state management', () => {
        const result = check({
          [COMPONENT]: `
            export class AppComponent {
              private loading: boolean = false;
            }
          `,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_STATE_MANAGEMENT),
        ]);
      });

      it('should not count a private field without a primitive type as state', () => {
        const result = check({
          [COMPONENT]: `
            export class AppComponent {
              constructor(private http: HttpClient) {}
            }
          `,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should suggest computed() over getter methods', () => {
        const result = check({
          [COMPONENT]: `
            export class AppComponent {
              get total() { return this.a + this.b; }
            }
          `,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_COMPUTED_OVER_GETTERS),
        ]);
      });

      it('should not suggest computed when already using computed()', () => {
        const result = check({
          [COMPONENT]: `
            export class AppComponent {
              doubled = computed(() => this.count() * 2);
              get total() { return this.a + this.b; }
            }
          `,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should suggest signals over async pipe when template has async pipe', () => {
        const result = check({
          [COMPONENT]: `export class AppComponent {}\n`,
          [TEMPLATE]: `<p>{{ data$ | async }}</p>\n`,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_SIGNALS_OVER_ASYNC),
        ]);
      });

      it('should not read an async pipe written in the component class', () => {
        const result = check({
          [COMPONENT]: `const note = '{{ data$ | async }}';\n`,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should not suggest replacing the async pipe when the component uses signals', () => {
        const result = check({
          [COMPONENT]: `count = signal(0);\n`,
          [TEMPLATE]: `<p>{{ data$ | async }}</p>\n`,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should suggest eliminating ChangeDetectorRef with signals', () => {
        const result = check({
          [COMPONENT]: `
            export class AppComponent {
              constructor(cdr: ChangeDetectorRef) {}
            }
          `,
        });

        expect(result.suggestions).toEqual([
          about(M.ELIMINATE_CHANGE_DETECTION),
        ]);
      });

      it('should suggest signals with OnPush strategy', () => {
        const result = check({
          [COMPONENT]: `
            @Component({
              selector: 'app-root',
              changeDetection: ChangeDetectionStrategy.OnPush,
            })
            export class AppComponent {}
          `,
        });

        expect(result.suggestions).toEqual([
          about(M.OPTIMIZE_ONPUSH_WITH_SIGNALS),
        ]);
      });

      it('should make no suggestion for a component that already uses signals', () => {
        const result = check({
          [COMPONENT]: `
            @Component({ changeDetection: ChangeDetectionStrategy.OnPush })
            export class AppComponent {
              private label: string = '';
              name = new FormControl('');
              count = signal(0);
              constructor(cdr: ChangeDetectorRef) {}
            }
          `,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should handle empty file content gracefully', () => {
        const result = check({ [COMPONENT]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should analyze multiple component files', () => {
        const result = check({
          [COMPONENT]: `data$ = new BehaviorSubject(0);\n`,
          'src/app/user/user.component.ts': `name = new FormControl('');\n`,
        });

        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            about(M.CONSIDER_SUBJECT_MIGRATION),
            about(M.CONSIDER_REACTIVE_FORMS_MIGRATION, 'user.component.ts'),
          ])
        );
        expect(result.suggestions).toHaveLength(2);
      });

      it('should read an unsuffixed Angular 20 component by its decorator', () => {
        const result = check({
          'src/app/hero.ts': `
            @Component({ selector: 'app-hero', template: '' })
            export class Hero {
              data$ = new BehaviorSubject(0);
            }
          `,
        });

        expect(result.suggestions).toEqual([
          about(M.CONSIDER_SUBJECT_MIGRATION, 'hero.ts'),
        ]);
      });
    });
  });

  describe('AngularSignalUsageConfiguration', () => {
    it('should look for component files only', () => {
      expect(AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS).toEqual([
        '.component.ts',
      ]);
    });

    it('should find the template next to the component', () => {
      expect(
        AngularSignalUsageConfiguration.PATTERN_DETECTORS.GET_TEMPLATE_FILE_PATH(
          'src/app/app.component.ts'
        )
      ).toBe('src/app/app.component.html');
    });
  });
});
