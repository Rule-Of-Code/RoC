/**
 * @fileoverview Tests for angular-signal-imports-configuration.ts
 * @description Tests for Angular signal imports configuration utilities
 */

import { AngularSignalImportsConfiguration } from '../../src/utils/angular/angular-signal-imports/angular-signal-imports-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-signal-imports/angular-signal-imports-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-signal-imports-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
        '.component.ts'
      );
    });

    it('should include service.ts extension', () => {
      expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
        '.service.ts'
      );
    });

    it('should include directive.ts extension', () => {
      expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
        '.directive.ts'
      );
    });

    it('should have exactly 3 file extensions', () => {
      expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toHaveLength(3);
    });
  });

  describe('SIGNAL_CHECKS', () => {
    it('should include signal check', () => {
      const signalCheck = AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
        c => c.import === 'signal'
      );
      expect(signalCheck).toBeDefined();
      expect(signalCheck?.usage).toBe('signal(');
      expect(signalCheck?.function).toBe('signal()');
    });

    it('should include computed check', () => {
      const computedCheck =
        AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
          c => c.import === 'computed'
        );
      expect(computedCheck).toBeDefined();
      expect(computedCheck?.usage).toBe('computed(');
    });

    it('should include effect check', () => {
      const effectCheck = AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
        c => c.import === 'effect'
      );
      expect(effectCheck).toBeDefined();
      expect(effectCheck?.usage).toBe('effect(');
    });

    it('should include WritableSignal check', () => {
      const writableCheck =
        AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
          c => c.import === 'WritableSignal'
        );
      expect(writableCheck).toBeDefined();
    });

    it('should include Signal type check', () => {
      const signalTypeCheck =
        AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
          c => c.import === 'Signal'
        );
      expect(signalTypeCheck).toBeDefined();
      expect(signalTypeCheck?.usage).toBe('Signal<');
    });

    it('should include inject check', () => {
      const injectCheck = AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
        c => c.import === 'inject'
      );
      expect(injectCheck).toBeDefined();
      expect(injectCheck?.usage).toBe('inject(');
    });
  });

  describe('SIGNAL_USAGE_INDICATORS', () => {
    it('should include signal(', () => {
      expect(
        AngularSignalImportsConfiguration.SIGNAL_USAGE_INDICATORS
      ).toContain('signal(');
    });

    it('should include computed(', () => {
      expect(
        AngularSignalImportsConfiguration.SIGNAL_USAGE_INDICATORS
      ).toContain('computed(');
    });

    it('should have 2 indicators', () => {
      expect(
        AngularSignalImportsConfiguration.SIGNAL_USAGE_INDICATORS
      ).toHaveLength(2);
    });
  });

  describe('RXJS_INTEROP_FUNCTIONS', () => {
    it('should include toSignal', () => {
      expect(
        AngularSignalImportsConfiguration.RXJS_INTEROP_FUNCTIONS
      ).toContain('toSignal');
    });

    it('should include toObservable', () => {
      expect(
        AngularSignalImportsConfiguration.RXJS_INTEROP_FUNCTIONS
      ).toContain('toObservable');
    });
  });

  describe('Package constants', () => {
    it('should have ANGULAR_CORE_PACKAGE', () => {
      expect(AngularSignalImportsConfiguration.ANGULAR_CORE_PACKAGE).toBe(
        '@angular/core'
      );
    });

    it('should have RXJS_INTEROP_PACKAGE', () => {
      expect(AngularSignalImportsConfiguration.RXJS_INTEROP_PACKAGE).toBe(
        '@angular/core/rxjs-interop'
      );
    });

    it('should have EXPERIMENTAL_PACKAGE', () => {
      expect(AngularSignalImportsConfiguration.EXPERIMENTAL_PACKAGE).toBe(
        '@angular/core/experimental'
      );
    });

    it('should have ANGULAR_CORE_IMPORT_REGEX', () => {
      expect(
        AngularSignalImportsConfiguration.ANGULAR_CORE_IMPORT_REGEX
      ).toBeInstanceOf(RegExp);
    });

    it('should have EFFECT_CLEANUP_INDICATOR', () => {
      expect(AngularSignalImportsConfiguration.EFFECT_CLEANUP_INDICATOR).toBe(
        'onDestroy'
      );
    });

    it('should have DESTROY_REF_IMPORT', () => {
      expect(AngularSignalImportsConfiguration.DESTROY_REF_IMPORT).toBe(
        'DestroyRef'
      );
    });
  });

  describe('COMPATIBLE_VERSIONS', () => {
    it('should include version 16', () => {
      expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
        '16'
      );
    });

    it('should include version 17', () => {
      expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
        '17'
      );
    });

    it('should include version 18', () => {
      expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
        '18'
      );
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have SIGNAL_NOT_IMPORTED with placeholders', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SIGNAL_NOT_IMPORTED
      ).toContain('{signal}');
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SIGNAL_NOT_IMPORTED
      ).toContain('{fileName}');
    });

    it('should have SUGGEST_IMPORT with placeholders', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES.SUGGEST_IMPORT
      ).toContain('{signal}');
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES.SUGGEST_IMPORT
      ).toContain('{fileName}');
    });

    it('should have DESTROY_REF_SUGGESTION with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .DESTROY_REF_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .DESTROY_REF_SUGGESTION
      ).toContain('DestroyRef');
    });

    it('should have COMBINE_IMPORTS with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES.COMBINE_IMPORTS
      ).toContain('{fileName}');
    });

    it('should have RXJS_INTEROP_NOT_IMPORTED with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .RXJS_INTEROP_NOT_IMPORTED
      ).toContain('{fileName}');
    });

    it('should have SUGGEST_RXJS_INTEROP_IMPORT with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SUGGEST_RXJS_INTEROP_IMPORT
      ).toContain('{fileName}');
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SUGGEST_RXJS_INTEROP_IMPORT
      ).toContain('toSignal');
    });

    it('should have SIGNALS_VERSION_INCOMPATIBLE with placeholders', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SIGNALS_VERSION_INCOMPATIBLE
      ).toContain('{version}');
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .SIGNALS_VERSION_INCOMPATIBLE
      ).toContain('{fileName}');
    });

    it('should have EXPERIMENTAL_SIGNALS_WARNING with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES
          .EXPERIMENTAL_SIGNALS_WARNING
      ).toContain('{fileName}');
    });

    it('should have UPGRADE_TO_STABLE with placeholder', () => {
      expect(
        AngularSignalImportsConfiguration.VALIDATION_MESSAGES.UPGRADE_TO_STABLE
      ).toContain('{fileName}');
    });
  });

  describe('buildFileNameMessage', () => {
    it('should replace fileName placeholder', () => {
      const result = AngularSignalImportsConfiguration.buildFileNameMessage(
        'Test message for {fileName}',
        'test.component.ts'
      );
      expect(result).toBe('Test message for test.component.ts');
    });

    it('should handle multiple fileName placeholders', () => {
      const result = AngularSignalImportsConfiguration.buildFileNameMessage(
        '{fileName} has issue in {fileName}',
        'app.service.ts'
      );
      expect(result).toContain('app.service.ts');
    });
  });

  describe('buildSignalMessage', () => {
    it('should replace signal and fileName placeholders', () => {
      const result = AngularSignalImportsConfiguration.buildSignalMessage(
        '{signal} not imported in {fileName}',
        'computed',
        'test.component.ts'
      );
      expect(result).toBe('computed not imported in test.component.ts');
    });
  });

  describe('buildVersionMessage', () => {
    it('should replace version and fileName placeholders', () => {
      const result = AngularSignalImportsConfiguration.buildVersionMessage(
        'Version {version} in {fileName}',
        '15',
        'test.component.ts'
      );
      expect(result).toBe('Version 15 in test.component.ts');
    });
  });
});
