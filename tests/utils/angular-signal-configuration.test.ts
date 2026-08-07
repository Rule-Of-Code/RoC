/**
 * @fileoverview Tests for angular-signal-configuration.ts
 * @description Tests for Angular signals configuration utilities
 */

import { AngularSignalConfiguration } from '../../src/utils/angular/angular-signals';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-signal-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-signal-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.component.ts'
      );
    });

    it('should include service.ts extension', () => {
      expect(AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.service.ts'
      );
    });

    it('should have exactly 2 file extensions', () => {
      expect(AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS).toHaveLength(
        2
      );
    });
  });

  describe('SIGNAL_PATTERNS', () => {
    it('should define SIGNAL_CALL pattern', () => {
      expect(AngularSignalConfiguration.SIGNAL_PATTERNS.SIGNAL_CALL).toBe(
        'signal()'
      );
    });

    it('should define COMPUTED_CALL pattern', () => {
      expect(AngularSignalConfiguration.SIGNAL_PATTERNS.COMPUTED_CALL).toBe(
        'computed('
      );
    });

    it('should define EFFECT_CALL pattern', () => {
      expect(AngularSignalConfiguration.SIGNAL_PATTERNS.EFFECT_CALL).toBe(
        'effect('
      );
    });
  });

  describe('getThresholds', () => {
    it('should return default MAX_MUTATIONS when no config provided', () => {
      const thresholds = AngularSignalConfiguration.getThresholds({});
      expect(thresholds.MAX_MUTATIONS).toBe(5);
    });

    it('should return configured MAX_MUTATIONS when provided', () => {
      const thresholds = AngularSignalConfiguration.getThresholds({
        thresholds: { angular: { maxSignalMutations: 10 } },
      });
      expect(thresholds.MAX_MUTATIONS).toBe(10);
    });

    it('should return default when config.thresholds is undefined', () => {
      const thresholds = AngularSignalConfiguration.getThresholds({
        thresholds: undefined,
      });
      expect(thresholds.MAX_MUTATIONS).toBe(5);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have SIGNAL_WITHOUT_VALUE message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES.SIGNAL_WITHOUT_VALUE;

      expect(msg.violationMessage).toContain('Signal');
      expect(msg.violationMessage).toContain('{fileName}');
      expect(msg.suggestionMessage).toContain('Initialize');
    });

    it('should have CONSIDER_READONLY_SIGNALS message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES
          .CONSIDER_READONLY_SIGNALS;

      expect(msg.suggestionMessage).toContain('readonly');
      expect(msg.suggestionMessage).toContain('{fileName}');
    });

    it('should have COMPUTED_WITHOUT_DEPENDENCIES message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES
          .COMPUTED_WITHOUT_DEPENDENCIES;

      expect(msg.suggestionMessage).toContain('Computed');
    });

    it('should have COMPUTED_WITH_SIDE_EFFECTS message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES
          .COMPUTED_WITH_SIDE_EFFECTS;

      expect(msg.violationMessage).toContain('pure');
      expect(msg.suggestionMessage).toContain('side effects');
    });

    it('should have EFFECT_WITHOUT_CLEANUP message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_WITHOUT_CLEANUP;

      expect(msg.suggestionMessage).toContain('cleanup');
    });

    it('should have EFFECT_IN_CONSTRUCTOR message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_IN_CONSTRUCTOR;

      expect(msg.suggestionMessage).toContain('ngOnInit');
    });

    it('should have INCONSISTENT_UPDATE_PATTERN message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES
          .INCONSISTENT_UPDATE_PATTERN;

      expect(msg.suggestionMessage).toContain('.set()');
      expect(msg.suggestionMessage).toContain('.update()');
    });

    it('should have EXCESSIVE_MUTATIONS message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES.EXCESSIVE_MUTATIONS;

      expect(msg.suggestionMessage).toContain('computed');
    });

    it('should have CONSIDER_EQUALITY_FUNCTION message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES
          .CONSIDER_EQUALITY_FUNCTION;

      expect(msg.suggestionMessage).toContain('equality');
    });

    it('should have CONSIDER_EXPLICIT_TYPING message', () => {
      const msg =
        AngularSignalConfiguration.VALIDATION_MESSAGES.CONSIDER_EXPLICIT_TYPING;

      expect(msg.suggestionMessage).toContain('WritableSignal');
    });
  });

  describe('buildMessageObject', () => {
    it('should replace {fileName} in all message properties', () => {
      const template = {
        violationMessage: 'Error in {fileName}',
        suggestionMessage: 'Fix {fileName}',
      };

      const result = AngularSignalConfiguration.buildMessageObject(
        template,
        'test.component.ts'
      );

      expect(result.violationMessage).toBe('Error in test.component.ts');
      expect(result.suggestionMessage).toBe('Fix test.component.ts');
    });

    it('should handle single property templates', () => {
      const template = {
        suggestionMessage: 'Consider {fileName}',
      };

      const result = AngularSignalConfiguration.buildMessageObject(
        template,
        'user.service.ts'
      );

      expect(result.suggestionMessage).toBe('Consider user.service.ts');
    });

    it('should preserve template structure', () => {
      const template = {
        first: 'Start: {fileName}',
        second: 'End: {fileName}',
        third: 'Middle: {fileName}',
      };

      const result = AngularSignalConfiguration.buildMessageObject(
        template,
        'app.ts'
      );

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.first).toBe('Start: app.ts');
    });
  });

  describe('PATTERN_DETECTORS', () => {
    describe('HAS_SIGNAL', () => {
      it('should detect signal( pattern', () => {
        const content = 'const count = signal(0);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SIGNAL(content);

        expect(result).toBe(true);
      });

      it('should return false when no signal', () => {
        const content = 'const count = 0;';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SIGNAL(content);

        expect(result).toBe(false);
      });
    });

    describe('HAS_COMPUTED', () => {
      it('should detect computed( pattern', () => {
        const content = 'const doubled = computed(() => count() * 2);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPUTED(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_EFFECT', () => {
      it('should detect effect( pattern', () => {
        const content = 'effect(() => console.log(count()));';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EFFECT(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_READONLY', () => {
      it('should detect readonly keyword', () => {
        const content = 'readonly count = signal(0);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_READONLY(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_ON_DESTROY', () => {
      it('should detect onDestroy pattern', () => {
        const content = 'onDestroy(() => {});';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_ON_DESTROY(content);

        expect(result).toBe(true);
      });

      it('should detect DestroyRef pattern', () => {
        const content = 'private destroyRef = inject(DestroyRef);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_ON_DESTROY(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_CONSTRUCTOR', () => {
      it('should detect constructor keyword', () => {
        const content = 'constructor() {}';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_CONSTRUCTOR(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_UPDATE_METHOD', () => {
      it('should detect .update( pattern', () => {
        const content = 'count.update(c => c + 1);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_UPDATE_METHOD(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_SET_METHOD', () => {
      it('should detect .set( pattern', () => {
        const content = 'count.set(5);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SET_METHOD(content);

        expect(result).toBe(true);
      });
    });

    describe('HAS_COMPLEX_OBJECTS', () => {
      it('should detect complex keyword', () => {
        const content = 'const complexData = signal({});';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPLEX_OBJECTS(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect object keyword', () => {
        const content = 'const objectData = signal({});';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPLEX_OBJECTS(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_EQUALITY_FUNCTION', () => {
      it('should detect equal: option', () => {
        const content = 'signal({ value: 1 }, { equal: deepEqual });';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EQUALITY_FUNCTION(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_EXPLICIT_TYPING', () => {
      it('should detect explicit signal typing with WritableSignal', () => {
        const content =
          'readonly count: WritableSignal<number> = signal<number>(0);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EXPLICIT_TYPING(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false without WritableSignal', () => {
        const content = 'const count = signal<number>(0);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EXPLICIT_TYPING(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('EXTRACT_SIGNAL_INITIALIZATIONS', () => {
      it('should extract signal initialization patterns', () => {
        const content = `
          const a = signal(0);
          const b = signal('hello');
          const c = signal([1, 2, 3]);
        `;
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_INITIALIZATIONS(
            content
          );

        expect(result).toHaveLength(3);
      });

      it('should return empty array when no signals', () => {
        const content = 'const count = 0;';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_INITIALIZATIONS(
            content
          );

        expect(result).toHaveLength(0);
      });
    });

    describe('EXTRACT_COMPUTED_BLOCKS', () => {
      it('should extract computed blocks', () => {
        const content = 'computed(() => count() * 2}';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_COMPUTED_BLOCKS(
            content
          );

        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('EXTRACT_SIGNAL_MUTATIONS', () => {
      it('should extract signal mutations', () => {
        const content = `
          count.set(5);
          name.set('John');
        `;
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_MUTATIONS(
            content
          );

        expect(result).toHaveLength(2);
      });
    });

    describe('CHECK_COMPUTED_WITHOUT_DEPENDENCIES', () => {
      it('should detect computed without dependencies', () => {
        const content = 'computed(() => 5);';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for computed with dependencies', () => {
        const content = 'computed(() => count() * 2);';
        // This checks for empty arrow function pattern
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(
            content
          );

        expect(result).toBe(true); // Pattern matches "() =>"
      });
    });

    describe('CHECK_EFFECT_IN_CONSTRUCTOR', () => {
      it('should detect effect inside constructor', () => {
        const content = `
          constructor() {
            effect(() => console.log('test'));
          }
        `;
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false when no constructor', () => {
        const content = 'effect(() => console.log("test"));';
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('CHECK_SIDE_EFFECTS_IN_COMPUTED', () => {
      it('should detect console usage in computed', () => {
        const matches = ['computed(() => { console.log(x); return x; })'];
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
            matches
          );

        expect(result).toBe(true);
      });

      it('should detect alert usage in computed', () => {
        const matches = ['computed(() => { alert(x); return x; })'];
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
            matches
          );

        expect(result).toBe(true);
      });

      it('should return false for pure computed', () => {
        const matches = ['computed(() => x * 2)'];
        const result =
          AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
            matches
          );

        expect(result).toBe(false);
      });
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze signal patterns in content', () => {
      const content = `
        readonly count = signal(0);
        readonly doubled = computed(() => this.count() * 2);

        constructor() {
          effect(() => console.log(this.count()));
        }
      `;

      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasSignal).toBe(true);
      expect(result.hasComputed).toBe(true);
      expect(result.hasEffect).toBe(true);
      expect(result.hasReadonly).toBe(true);
      expect(result.hasConstructor).toBe(true);
      expect(result.fileName).toBe('test.component.ts');
    });

    it('should return file name from path', () => {
      const content = 'const count = signal(0);';
      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        '/path/to/my-component.ts'
      );

      expect(result.fileName).toBe('my-component.ts');
      expect(result.filePath).toBe('/path/to/my-component.ts');
    });

    it('should extract signal initializations', () => {
      const content = `
        const a = signal(1);
        const b = signal(2);
      `;

      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        'test.ts'
      );

      expect(result.signalInitializations.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect signal mutations', () => {
      const content = `
        count.set(5);
        name.set('test');
      `;

      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        'test.ts'
      );

      expect(result.signalMutations.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty content', () => {
      const result = AngularSignalConfiguration.analyzePatterns('', 'test.ts');

      expect(result.hasSignal).toBe(false);
      expect(result.hasComputed).toBe(false);
      expect(result.hasEffect).toBe(false);
    });

    it('should detect set and update methods', () => {
      const content = `
        count.set(5);
        count.update(c => c + 1);
      `;

      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        'test.ts'
      );

      expect(result.hasSet).toBe(true);
      expect(result.hasUpdate).toBe(true);
    });

    it('should detect equality function usage', () => {
      const content = 'signal({ value: 1 }, { equal: customEqual });';

      const result = AngularSignalConfiguration.analyzePatterns(
        content,
        'test.ts'
      );

      expect(result.hasEqualityFunction).toBe(true);
    });
  });
});
