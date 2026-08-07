/**
 * @fileoverview Tests for angular-signal-usage-configuration.ts
 * @description Tests for Angular Signal Usage Configuration utility
 */

import { AngularSignalUsageConfiguration } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-configuration';

describe('utils/angular/angular-signal-usage/angular-signal-usage-configuration', () => {
  describe('AngularSignalUsageConfiguration', () => {
    describe('ANGULAR_FILE_EXTENSIONS', () => {
      it('should include component.ts extension', () => {
        expect(
          AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS
        ).toContain('.component.ts');
      });

      it('should be readonly array', () => {
        expect(
          Array.isArray(AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS)
        ).toBe(true);
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have CONSIDER_SUBJECT_MIGRATION message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_SUBJECT_MIGRATION
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_SUBJECT_MIGRATION.suggestionMessage
        ).toContain('{fileName}');
      });

      it('should have CONSIDER_REACTIVE_FORMS_MIGRATION message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_REACTIVE_FORMS_MIGRATION
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_REACTIVE_FORMS_MIGRATION.suggestionMessage
        ).toContain('form');
      });

      it('should have CONSIDER_STATE_MANAGEMENT message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_STATE_MANAGEMENT
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_STATE_MANAGEMENT.suggestionMessage
        ).toContain('state');
      });

      it('should have CONSIDER_COMPUTED_OVER_GETTERS message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_COMPUTED_OVER_GETTERS
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_COMPUTED_OVER_GETTERS.suggestionMessage
        ).toContain('computed');
      });

      it('should have CONSIDER_SIGNALS_OVER_ASYNC message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_SIGNALS_OVER_ASYNC
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .CONSIDER_SIGNALS_OVER_ASYNC.suggestionMessage
        ).toContain('async');
      });

      it('should have ELIMINATE_CHANGE_DETECTION message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .ELIMINATE_CHANGE_DETECTION
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .ELIMINATE_CHANGE_DETECTION.suggestionMessage
        ).toContain('change detection');
      });

      it('should have OPTIMIZE_ONPUSH_WITH_SIGNALS message', () => {
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .OPTIMIZE_ONPUSH_WITH_SIGNALS
        ).toBeDefined();
        expect(
          AngularSignalUsageConfiguration.VALIDATION_MESSAGES
            .OPTIMIZE_ONPUSH_WITH_SIGNALS.suggestionMessage
        ).toContain('OnPush');
      });
    });

    describe('PATTERN_DETECTORS', () => {
      describe('HAS_SIGNAL_USAGE', () => {
        it('should detect signal() usage', () => {
          const content = 'const count = signal(0);';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should detect computed() usage', () => {
          const content = 'const doubled = computed(() => count() * 2);';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should detect effect() usage', () => {
          const content = 'effect(() => console.log(count()));';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should return false when no signal usage', () => {
          const content = 'const count = 0;';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_SUBJECT_USAGE', () => {
        it('should detect BehaviorSubject usage', () => {
          const content = 'private data$ = new BehaviorSubject<string>("");';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should detect Subject usage', () => {
          const content = 'private events$ = new Subject<void>();';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should return false when no subject usage', () => {
          const content = 'private data = "";';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_FORM_CONTROL', () => {
        it('should detect FormControl usage', () => {
          const content = 'name = new FormControl("");';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
              content
            )
          ).toBe(true);
        });

        it('should return false when no FormControl usage', () => {
          const content = 'name = "";';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_COMPONENT_STATE', () => {
        it('should detect private boolean state', () => {
          const content = 'private isLoading: boolean = false;';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
              content
            )
          ).toBe(true);
        });

        it('should detect private string state', () => {
          const content = 'private userName: string = "";';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
              content
            )
          ).toBe(true);
        });

        it('should detect private number state', () => {
          const content = 'private count: number = 0;';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
              content
            )
          ).toBe(true);
        });

        it('should detect private any state', () => {
          const content = 'private data: any = null;';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
              content
            )
          ).toBe(true);
        });

        it('should return false when no private state', () => {
          const content = 'public name = "";';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_GETTER_METHODS', () => {
        it('should detect getter methods', () => {
          const content = 'get fullName() { return ""; }';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_GETTER_METHODS(
              content
            )
          ).toBe(true);
        });

        it('should return false when no getter methods', () => {
          const content = 'getFullName() { return ""; }';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_GETTER_METHODS(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_COMPUTED_USAGE', () => {
        it('should detect computed() usage', () => {
          const content = 'fullName = computed(() => "");';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPUTED_USAGE(
              content
            )
          ).toBe(true);
        });

        it('should return false when no computed usage', () => {
          const content = 'fullName = "";';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPUTED_USAGE(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_ASYNC_PIPE', () => {
        it('should detect async pipe in template', () => {
          const content = '{{ data$ | async }}';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ASYNC_PIPE(
              content
            )
          ).toBe(true);
        });

        it('should return false when no async pipe', () => {
          const content = '{{ data }}';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ASYNC_PIPE(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_CHANGE_DETECTOR_REF', () => {
        it('should detect ChangeDetectorRef usage', () => {
          const content = 'constructor(private cdr: ChangeDetectorRef) {}';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_CHANGE_DETECTOR_REF(
              content
            )
          ).toBe(true);
        });

        it('should return false when no ChangeDetectorRef', () => {
          const content = 'constructor() {}';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_CHANGE_DETECTOR_REF(
              content
            )
          ).toBe(false);
        });
      });

      describe('HAS_ON_PUSH', () => {
        it('should detect OnPush strategy', () => {
          const content = 'changeDetection: ChangeDetectionStrategy.OnPush';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ON_PUSH(
              content
            )
          ).toBe(true);
        });

        it('should return false when no OnPush', () => {
          const content = 'changeDetection: ChangeDetectionStrategy.Default';
          expect(
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ON_PUSH(
              content
            )
          ).toBe(false);
        });
      });

      describe('EXTRACT_GETTER_METHODS', () => {
        it('should extract getter methods', () => {
          const content = `
            get fullName() { return ""; }
            get age() { return 0; }
          `;
          const result =
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.EXTRACT_GETTER_METHODS(
              content
            );
          expect(result).toHaveLength(2);
        });

        it('should return empty array when no getters', () => {
          const content = 'getFullName() { return ""; }';
          const result =
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.EXTRACT_GETTER_METHODS(
              content
            );
          expect(result).toHaveLength(0);
        });
      });

      describe('GET_TEMPLATE_FILE_PATH', () => {
        it('should convert component.ts to component.html', () => {
          const result =
            AngularSignalUsageConfiguration.PATTERN_DETECTORS.GET_TEMPLATE_FILE_PATH(
              '/path/to/app.component.ts'
            );
          expect(result).toBe('/path/to/app.component.html');
        });
      });
    });

    describe('analyzePatterns', () => {
      it('should return all pattern detection results', () => {
        const content = `
          private data$ = new BehaviorSubject<string>('');
          private isLoading: boolean = false;
          get fullName() { return ''; }
        `;
        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasSubjectUsage).toBe(true);
        expect(result.hasComponentState).toBe(true);
        expect(result.hasGetterMethods).toBe(true);
        expect(result.hasSignalUsage).toBe(false);
        expect(result.fileName).toBe('app.component.ts');
        expect(result.filePath).toBe('/test/app.component.ts');
      });

      it('should detect signal usage patterns', () => {
        const content = `
          const count = signal(0);
          const doubled = computed(() => count() * 2);
          effect(() => console.log(count()));
        `;
        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasSignalUsage).toBe(true);
        expect(result.hasComputedUsage).toBe(true);
      });

      it('should detect async pipe in template content', () => {
        const content = 'export class AppComponent {}';
        const templateContent = '{{ data$ | async }}';

        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts',
          templateContent
        );

        expect(result.hasAsyncPipe).toBe(true);
      });

      it('should not have async pipe when template not provided', () => {
        const content = 'export class AppComponent {}';

        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasAsyncPipe).toBe(false);
      });

      it('should include template content in result', () => {
        const content = 'export class AppComponent {}';
        const templateContent = '<div>Hello</div>';

        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts',
          templateContent
        );

        expect(result.templateContent).toBe(templateContent);
      });

      it('should detect FormControl and ChangeDetectorRef', () => {
        const content = `
          name = new FormControl('');
          constructor(private cdr: ChangeDetectorRef) {}
        `;
        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasFormControl).toBe(true);
        expect(result.hasChangeDetectorRef).toBe(true);
      });

      it('should detect OnPush change detection strategy', () => {
        const content = `
          @Component({
            changeDetection: ChangeDetectionStrategy.OnPush
          })
        `;
        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasOnPush).toBe(true);
      });

      it('should extract getter methods list', () => {
        const content = `
          get firstName() { return ''; }
          get lastName() { return ''; }
        `;
        const result = AngularSignalUsageConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.getterMethods).toHaveLength(2);
      });
    });
  });
});
