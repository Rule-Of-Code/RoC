/**
 * @fileoverview Tests for angular-signal-usage-configuration.ts
 * @description Tests for Angular signal usage configuration utilities
 */

import { AngularSignalUsageConfiguration } from '../../src/utils/angular/angular-signal-usage/angular-signal-usage-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-signal-usage/angular-signal-usage-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-signal-usage-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.component.ts'
      );
    });

    it('should have exactly 1 file extension', () => {
      expect(
        AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toHaveLength(1);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have CONSIDER_SUBJECT_MIGRATION message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .CONSIDER_SUBJECT_MIGRATION;
      expect(msg.suggestionMessage).toContain('Subject');
      expect(msg.suggestionMessage).toContain('{fileName}');
    });

    it('should have CONSIDER_REACTIVE_FORMS_MIGRATION message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .CONSIDER_REACTIVE_FORMS_MIGRATION;
      expect(msg.suggestionMessage).toContain('signal-based forms');
      expect(msg.suggestionMessage).toContain('{fileName}');
    });

    it('should have CONSIDER_STATE_MANAGEMENT message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .CONSIDER_STATE_MANAGEMENT;
      expect(msg.suggestionMessage).toContain('signals');
      expect(msg.suggestionMessage).toContain('state management');
    });

    it('should have CONSIDER_COMPUTED_OVER_GETTERS message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .CONSIDER_COMPUTED_OVER_GETTERS;
      expect(msg.suggestionMessage).toContain('computed()');
      expect(msg.suggestionMessage).toContain('getter');
    });

    it('should have CONSIDER_SIGNALS_OVER_ASYNC message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .CONSIDER_SIGNALS_OVER_ASYNC;
      expect(msg.suggestionMessage).toContain('signals');
      expect(msg.suggestionMessage).toContain('async pipe');
    });

    it('should have ELIMINATE_CHANGE_DETECTION message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .ELIMINATE_CHANGE_DETECTION;
      expect(msg.suggestionMessage).toContain('Signals');
      expect(msg.suggestionMessage).toContain('change detection');
    });

    it('should have OPTIMIZE_ONPUSH_WITH_SIGNALS message', () => {
      const msg =
        AngularSignalUsageConfiguration.VALIDATION_MESSAGES
          .OPTIMIZE_ONPUSH_WITH_SIGNALS;
      expect(msg.suggestionMessage).toContain('signals');
      expect(msg.suggestionMessage).toContain('OnPush');
    });
  });

  describe('PATTERN_DETECTORS', () => {
    describe('HAS_SIGNAL_USAGE', () => {
      it('should detect signal( usage', () => {
        const content = 'const count = signal(0);';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should detect computed( usage', () => {
        const content = 'const double = computed(() => count() * 2);';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should detect effect( usage', () => {
        const content = 'effect(() => console.log(count()));';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should return false for no signal usage', () => {
        const content = 'const count = 0;';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SIGNAL_USAGE(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_SUBJECT_USAGE', () => {
      it('should detect BehaviorSubject', () => {
        const content = 'const subject = new BehaviorSubject(0);';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should detect Subject', () => {
        const content = 'const subject = new Subject();';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should return false for no subject usage', () => {
        const content = 'const count = signal(0);';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_SUBJECT_USAGE(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_FORM_CONTROL', () => {
      it('should detect FormControl', () => {
        const content = 'const name = new FormControl();';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
            content
          )
        ).toBe(true);
      });

      it('should return false for no FormControl', () => {
        const content = 'const name = signal("");';
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
        const content = 'private name: string = "";';
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

      it('should return false for no component state', () => {
        const content = 'public name = signal("");';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPONENT_STATE(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_GETTER_METHODS', () => {
      it('should detect getter methods', () => {
        const content = 'get fullName() { return this.name; }';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_GETTER_METHODS(
            content
          )
        ).toBe(true);
      });

      it('should return false for no getter methods', () => {
        const content = 'const fullName = computed(() => name());';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_GETTER_METHODS(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_COMPUTED_USAGE', () => {
      it('should detect computed( usage', () => {
        const content = 'const double = computed(() => count() * 2);';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPUTED_USAGE(
            content
          )
        ).toBe(true);
      });

      it('should return false for no computed usage', () => {
        const content = 'get double() { return this.count * 2; }';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_COMPUTED_USAGE(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_ASYNC_PIPE', () => {
      it('should detect async pipe', () => {
        const content = '{{ items$ | async }}';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ASYNC_PIPE(
            content
          )
        ).toBe(true);
      });

      it('should return false for no async pipe', () => {
        const content = '{{ items() }}';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ASYNC_PIPE(
            content
          )
        ).toBe(false);
      });
    });

    describe('HAS_CHANGE_DETECTOR_REF', () => {
      it('should detect ChangeDetectorRef', () => {
        const content = 'constructor(private cdr: ChangeDetectorRef) {}';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_CHANGE_DETECTOR_REF(
            content
          )
        ).toBe(true);
      });

      it('should return false for no ChangeDetectorRef', () => {
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
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ON_PUSH(content)
        ).toBe(true);
      });

      it('should return false for no OnPush', () => {
        const content = 'changeDetection: ChangeDetectionStrategy.Default';
        expect(
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.HAS_ON_PUSH(content)
        ).toBe(false);
      });
    });

    describe('EXTRACT_GETTER_METHODS', () => {
      it('should extract getter methods', () => {
        const content = `
          get fullName() { return this.name; }
          get age() { return this.years; }
        `;
        const result =
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.EXTRACT_GETTER_METHODS(
            content
          );
        expect(result).toHaveLength(2);
      });

      it('should return empty array for no getters', () => {
        const content = 'const name = "test";';
        const result =
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.EXTRACT_GETTER_METHODS(
            content
          );
        expect(result).toEqual([]);
      });
    });

    describe('GET_TEMPLATE_FILE_PATH', () => {
      it('should convert component.ts to component.html', () => {
        const result =
          AngularSignalUsageConfiguration.PATTERN_DETECTORS.GET_TEMPLATE_FILE_PATH(
            'app.component.ts'
          );
        expect(result).toBe('app.component.html');
      });
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze component patterns correctly', () => {
      const content = `
        import { signal, computed, effect } from '@angular/core';
        const count = signal(0);
        const double = computed(() => count() * 2);
      `;
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts'
      );

      expect(result.hasSignalUsage).toBe(true);
      expect(result.hasComputedUsage).toBe(true);
      expect(result.fileName).toBe('test.component.ts');
      expect(result.filePath).toBe('/path/to/test.component.ts');
    });

    it('should detect subject usage', () => {
      const content = 'const subject = new BehaviorSubject(0);';
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts'
      );

      expect(result.hasSubjectUsage).toBe(true);
    });

    it('should detect async pipe in template', () => {
      const content = 'const items$ = this.service.getItems();';
      const template = '{{ items$ | async }}';
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts',
        template
      );

      expect(result.hasAsyncPipe).toBe(true);
    });

    it('should return false for async pipe without template', () => {
      const content = 'const items$ = this.service.getItems();';
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts'
      );

      expect(result.hasAsyncPipe).toBe(false);
    });

    it('should extract getter methods', () => {
      const content = `
        get fullName() { return this.name; }
        get age() { return this.years; }
      `;
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts'
      );

      expect(result.hasGetterMethods).toBe(true);
      expect(result.getterMethods).toHaveLength(2);
    });

    it('should detect OnPush strategy', () => {
      const content = 'changeDetection: ChangeDetectionStrategy.OnPush';
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts'
      );

      expect(result.hasOnPush).toBe(true);
    });

    it('should include template content in result', () => {
      const content = 'const count = signal(0);';
      const template = '<p>{{ count() }}</p>';
      const result = AngularSignalUsageConfiguration.analyzePatterns(
        content,
        '/path/to/test.component.ts',
        template
      );

      expect(result.templateContent).toBe(template);
    });
  });
});
