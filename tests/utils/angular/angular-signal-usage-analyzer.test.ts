/**
 * @fileoverview Tests for angular-signal-usage-analyzer.ts
 * @description Tests for Angular Signal Usage Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalUsageAnalyzer } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-analyzer';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';
import { AngularSignalUsageConfiguration } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-configuration';
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
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

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
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockImplementation((path: string) => {
          if (path.includes('.html')) return false;
          return true;
        });
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          get fullName() {
            return this.firstName + ' ' + this.lastName;
          }
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('computed'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should not suggest computed when already using computed()', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockImplementation((path: string) => {
          if (path.includes('.html')) return false;
          return true;
        });
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          get fullName() { return ''; }
          fullName = computed(() => this.firstName() + ' ' + this.lastName());
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter(s => s.includes('computed'))
        ).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest signals over async pipe when template has async pipe', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockImplementation((filePath: string) => {
          if (filePath.includes('.html')) {
            return '{{ data$ | async }}';
          }
          return `export class AppComponent {}`;
        });

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.some(
            s => s.includes('async pipe') || s.includes('performance')
          )
        ).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest eliminating ChangeDetectorRef with signals', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockImplementation((path: string) => {
          if (path.includes('.html')) return false;
          return true;
        });
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          constructor(private cdr: ChangeDetectorRef) {}
          update() {
            this.cdr.detectChanges();
          }
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.some(s => s.includes('change detection'))
        ).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest signals with OnPush strategy', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockImplementation((path: string) => {
          if (path.includes('.html')) return false;
          return true;
        });
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          @Component({
            changeDetection: ChangeDetectionStrategy.OnPush
          })
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('OnPush'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should handle empty file content gracefully', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue('');

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should analyze multiple component files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockImplementation((path: string) => {
          if (path.includes('.html')) return false;
          return true;
        });
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/app.component.ts',
          '/test/project/src/user.component.ts',
        ]);
        readFileSpy.mockImplementation((filePath: string) => {
          if (filePath.includes('app.component')) {
            return 'private data$ = new BehaviorSubject("");';
          }
          return 'private name: string = "";';
        });

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.length).toBeGreaterThan(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });
    });
  });
});
