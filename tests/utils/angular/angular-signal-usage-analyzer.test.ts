/**
 * @fileoverview Tests for angular-signal-usage-analyzer.ts
 * @description Tests for Angular Signal Usage Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalUsageAnalyzer } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-analyzer';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

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
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
      });

      it('should return empty results when no component files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest migrating from BehaviorSubject to signals', () => {
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
          private data$ = new BehaviorSubject<string>('');
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.some(
            s => s.includes('BehaviorSubject') || s.includes('Subject')
          )
        ).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest migrating from Subject to signals', () => {
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
          private events$ = new Subject<void>();
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('Subject'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should not suggest Subject migration when signals are already used', () => {
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
          private data$ = new BehaviorSubject<string>('');
          private count = signal(0);
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter(s => s.includes('Subject'))
        ).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest using signals for FormControl', () => {
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
          name = new FormControl('');
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('form'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should suggest signals for component state management', () => {
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
          private isLoading: boolean = false;
          private userName: string = '';
        `);

        const result = AngularSignalUsageAnalyzer.checkSignalUsage(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.some(s => s.includes('state management'))
        ).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
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
