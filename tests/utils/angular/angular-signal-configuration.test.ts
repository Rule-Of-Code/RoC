/**
 * @fileoverview Tests for angular-signal-configuration.ts
 * @description Tests for Angular Signal Configuration utility
 */

import { AngularSignalConfiguration } from '../../../src/utils/angular/angular-signals/angular-signal-configuration';

describe('utils/angular/angular-signals/angular-signal-configuration', () => {
  describe('AngularSignalConfiguration', () => {
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

      it('should be readonly array', () => {
        expect(
          Array.isArray(AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS)
        ).toBe(true);
      });
    });

    describe('SIGNAL_PATTERNS', () => {
      it('should have SIGNAL_CALL pattern', () => {
        expect(AngularSignalConfiguration.SIGNAL_PATTERNS.SIGNAL_CALL).toBe(
          'signal()'
        );
      });

      it('should have COMPUTED_CALL pattern', () => {
        expect(AngularSignalConfiguration.SIGNAL_PATTERNS.COMPUTED_CALL).toBe(
          'computed('
        );
      });

      it('should have EFFECT_CALL pattern', () => {
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
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.SIGNAL_WITHOUT_VALUE
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.SIGNAL_WITHOUT_VALUE
            .violationMessage
        ).toContain('{fileName}');
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.SIGNAL_WITHOUT_VALUE
            .suggestionMessage
        ).toContain('Initialize');
      });

      it('should have CONSIDER_READONLY_SIGNALS message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_READONLY_SIGNALS
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_READONLY_SIGNALS.suggestionMessage
        ).toContain('readonly');
      });

      it('should have COMPUTED_WITHOUT_DEPENDENCIES message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .COMPUTED_WITHOUT_DEPENDENCIES
        ).toBeDefined();
      });

      it('should have COMPUTED_WITH_SIDE_EFFECTS message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .COMPUTED_WITH_SIDE_EFFECTS
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .COMPUTED_WITH_SIDE_EFFECTS.violationMessage
        ).toContain('pure');
      });

      it('should have EFFECT_WITHOUT_CLEANUP message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_WITHOUT_CLEANUP
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_WITHOUT_CLEANUP
            .suggestionMessage
        ).toContain('cleanup');
      });

      it('should have EFFECT_IN_CONSTRUCTOR message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_IN_CONSTRUCTOR
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EFFECT_IN_CONSTRUCTOR
            .suggestionMessage
        ).toContain('ngOnInit');
      });

      it('should have INCONSISTENT_UPDATE_PATTERN message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .INCONSISTENT_UPDATE_PATTERN
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .INCONSISTENT_UPDATE_PATTERN.suggestionMessage
        ).toContain('.set()');
      });

      it('should have EXCESSIVE_MUTATIONS message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EXCESSIVE_MUTATIONS
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES.EXCESSIVE_MUTATIONS
            .suggestionMessage
        ).toContain('computed');
      });

      it('should have CONSIDER_EQUALITY_FUNCTION message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_EQUALITY_FUNCTION
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_EQUALITY_FUNCTION.suggestionMessage
        ).toContain('equality');
      });

      it('should have CONSIDER_EXPLICIT_TYPING message', () => {
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_EXPLICIT_TYPING
        ).toBeDefined();
        expect(
          AngularSignalConfiguration.VALIDATION_MESSAGES
            .CONSIDER_EXPLICIT_TYPING.suggestionMessage
        ).toContain('WritableSignal');
      });
    });

    describe('PATTERN_DETECTORS', () => {
      describe('HAS_SIGNAL', () => {
        it('should detect signal() usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SIGNAL(
              'const count = signal(0);'
            )
          ).toBe(true);
        });

        it('should return false when no signal', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SIGNAL(
              'const count = 0;'
            )
          ).toBe(false);
        });
      });

      describe('HAS_COMPUTED', () => {
        it('should detect computed() usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPUTED(
              'computed(() => count() * 2)'
            )
          ).toBe(true);
        });

        it('should return false when no computed', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPUTED(
              'const x = 0;'
            )
          ).toBe(false);
        });
      });

      describe('HAS_EFFECT', () => {
        it('should detect effect() usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EFFECT(
              'effect(() => {})'
            )
          ).toBe(true);
        });

        it('should return false when no effect', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EFFECT(
              'const x = 0;'
            )
          ).toBe(false);
        });
      });

      describe('HAS_READONLY', () => {
        it('should detect readonly keyword', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_READONLY(
              'readonly count = signal(0);'
            )
          ).toBe(true);
        });

        it('should return false when no readonly', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_READONLY(
              'const count = signal(0);'
            )
          ).toBe(false);
        });
      });

      describe('HAS_ON_DESTROY', () => {
        it('should detect onDestroy usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_ON_DESTROY(
              'onDestroy(() => {})'
            )
          ).toBe(true);
        });

        it('should detect DestroyRef usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_ON_DESTROY(
              'inject(DestroyRef)'
            )
          ).toBe(true);
        });

        it('should return false when no destroy patterns', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_ON_DESTROY(
              'const x = 0;'
            )
          ).toBe(false);
        });
      });

      describe('HAS_CONSTRUCTOR', () => {
        it('should detect constructor keyword', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_CONSTRUCTOR(
              'constructor() {}'
            )
          ).toBe(true);
        });

        it('should return false when no constructor', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_CONSTRUCTOR(
              'ngOnInit() {}'
            )
          ).toBe(false);
        });
      });

      describe('HAS_UPDATE_METHOD', () => {
        it('should detect .update() usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_UPDATE_METHOD(
              'count.update(v => v + 1)'
            )
          ).toBe(true);
        });

        it('should return false when no update method', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_UPDATE_METHOD(
              'count.set(1)'
            )
          ).toBe(false);
        });
      });

      describe('HAS_SET_METHOD', () => {
        it('should detect .set() usage', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SET_METHOD(
              'count.set(1)'
            )
          ).toBe(true);
        });

        it('should return false when no set method', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_SET_METHOD(
              'count.update(v => v + 1)'
            )
          ).toBe(false);
        });
      });

      describe('HAS_COMPLEX_OBJECTS', () => {
        it('should detect complex keyword', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPLEX_OBJECTS(
              '// complex data structure'
            )
          ).toBe(true);
        });

        it('should detect object keyword', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPLEX_OBJECTS(
              'const obj: object = {}'
            )
          ).toBe(true);
        });

        it('should return false when no complex objects', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_COMPLEX_OBJECTS(
              'const x = 0;'
            )
          ).toBe(false);
        });
      });

      describe('HAS_EQUALITY_FUNCTION', () => {
        it('should detect equal: option', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EQUALITY_FUNCTION(
              'signal({ value: 0 }, { equal: (a, b) => a.value === b.value })'
            )
          ).toBe(true);
        });

        it('should return false when no equality function', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EQUALITY_FUNCTION(
              'signal({ value: 0 })'
            )
          ).toBe(false);
        });
      });

      describe('HAS_EXPLICIT_TYPING', () => {
        it('should detect explicit signal typing with WritableSignal', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EXPLICIT_TYPING(
              'count: WritableSignal<number> = signal<number>(0)'
            )
          ).toBe(true);
        });

        it('should return false when no explicit typing', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.HAS_EXPLICIT_TYPING(
              'count = signal(0)'
            )
          ).toBe(false);
        });
      });

      describe('EXTRACT_SIGNAL_INITIALIZATIONS', () => {
        it('should extract signal initializations', () => {
          const content = 'const a = signal(0); const b = signal("hello");';
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_INITIALIZATIONS(
              content
            );
          expect(result).toHaveLength(2);
        });

        it('should return empty array when no signals', () => {
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_INITIALIZATIONS(
              'const x = 0;'
            );
          expect(result).toHaveLength(0);
        });
      });

      describe('EXTRACT_COMPUTED_BLOCKS', () => {
        it('should extract computed blocks', () => {
          const content = 'computed(() => { return count(); })';
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_COMPUTED_BLOCKS(
              content
            );
          expect(result.length).toBeGreaterThan(0);
        });

        it('should return empty array when no computed blocks', () => {
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_COMPUTED_BLOCKS(
              'const x = 0;'
            );
          expect(result).toHaveLength(0);
        });
      });

      describe('EXTRACT_SIGNAL_MUTATIONS', () => {
        it('should extract signal mutations', () => {
          const content = 'count.set(1); name.set("hello");';
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_MUTATIONS(
              content
            );
          expect(result).toHaveLength(2);
        });

        it('should return empty array when no mutations', () => {
          const result =
            AngularSignalConfiguration.PATTERN_DETECTORS.EXTRACT_SIGNAL_MUTATIONS(
              'const x = count();'
            );
          expect(result).toHaveLength(0);
        });
      });

      describe('CHECK_COMPUTED_WITHOUT_DEPENDENCIES', () => {
        it('should detect computed without signal dependencies', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(
              'computed( () => 5)'
            )
          ).toBe(true);
        });

        it('should detect arrow function pattern in any computed', () => {
          // Note: This regex checks for the pattern computed(() =>, regardless of body content
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(
              'computed(() => count() * 2)'
            )
          ).toBe(true);
        });

        it('should return false when no computed arrow function pattern', () => {
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(
              'myFunction()'
            )
          ).toBe(false);
        });
      });

      describe('CHECK_EFFECT_IN_CONSTRUCTOR', () => {
        it('should detect effect in constructor', () => {
          const content = `
            constructor() {
              effect(() => console.log('test'));
            }
          `;
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(
              content
            )
          ).toBe(true);
        });

        it('should return false when no constructor', () => {
          const content = 'effect(() => console.log("test"));';
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(
              content
            )
          ).toBe(false);
        });

        it('should return false when effect outside constructor', () => {
          const content = `
            constructor() {}
            ngOnInit() {
              effect(() => console.log('test'));
            }
          `;
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(
              content
            )
          ).toBe(false);
        });
      });

      describe('CHECK_SIDE_EFFECTS_IN_COMPUTED', () => {
        it('should detect console.log in computed', () => {
          const matches = [
            'computed(() => { console.log("test"); return x; })',
          ];
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
              matches
            )
          ).toBe(true);
        });

        it('should detect alert in computed', () => {
          const matches = ['computed(() => { alert("test"); return x; })'];
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
              matches
            )
          ).toBe(true);
        });

        it('should return false for pure computed', () => {
          const matches = ['computed(() => { return count() * 2; })'];
          expect(
            AngularSignalConfiguration.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
              matches
            )
          ).toBe(false);
        });
      });
    });

    describe('buildMessageObject', () => {
      it('should replace fileName placeholder in all properties', () => {
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
    });

    describe('analyzePatterns', () => {
      it('should return all pattern detection results', () => {
        const content = `
          const count = signal(0);
          readonly name = signal('');
          const doubled = computed(() => count() * 2);
          effect(() => console.log(count()));
          count.set(1);
          count.update(v => v + 1);
        `;
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasSignal).toBe(true);
        expect(result.hasComputed).toBe(true);
        expect(result.hasEffect).toBe(true);
        expect(result.hasReadonly).toBe(true);
        expect(result.hasSet).toBe(true);
        expect(result.hasUpdate).toBe(true);
        expect(result.fileName).toBe('app.component.ts');
        expect(result.filePath).toBe('/test/app.component.ts');
      });

      it('should extract signal initializations', () => {
        const content = 'const a = signal(0); const b = signal("hello");';
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.signalInitializations).toHaveLength(2);
      });

      it('should extract computed blocks', () => {
        const content =
          'computed(() => { return x; }) computed(() => { return y; })';
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.computedBlocks.length).toBeGreaterThan(0);
      });

      it('should extract signal mutations', () => {
        const content = 'count.set(1); name.set("hello");';
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.signalMutations).toHaveLength(2);
      });

      it('should detect constructor and onDestroy', () => {
        const content = `
          constructor() {}
          onDestroy(() => cleanup());
        `;
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasConstructor).toBe(true);
        expect(result.hasOnDestroy).toBe(true);
      });

      it('should detect equality function and explicit typing', () => {
        const content = `
          count: WritableSignal<number> = signal<number>(0, { equal: (a, b) => a === b });
        `;
        const result = AngularSignalConfiguration.analyzePatterns(
          content,
          '/test/app.component.ts'
        );

        expect(result.hasEqualityFunction).toBe(true);
        expect(result.hasExplicitTyping).toBe(true);
      });

      it('should handle empty content', () => {
        const result = AngularSignalConfiguration.analyzePatterns(
          '',
          '/test/app.component.ts'
        );

        expect(result.hasSignal).toBe(false);
        expect(result.hasComputed).toBe(false);
        expect(result.hasEffect).toBe(false);
        expect(result.signalInitializations).toHaveLength(0);
        expect(result.computedBlocks).toHaveLength(0);
        expect(result.signalMutations).toHaveLength(0);
      });
    });
  });
});
