/**
 * Tests for NgRxDevToolsPatternConstants
 *
 * Tests patterns, messages, score deductions, and helper methods.
 */
import { NgRxDevToolsPatternConstants } from '../../../src/laws/angular/ngrx-devtools-integration-mandate/constants/patterns';

describe('NgRxDevToolsPatternConstants', () => {
  describe('STORE_DEVTOOLS_PACKAGE', () => {
    it('should be @ngrx/store-devtools', () => {
      expect(NgRxDevToolsPatternConstants.STORE_DEVTOOLS_PACKAGE).toBe(
        '@ngrx/store-devtools'
      );
    });
  });

  describe('DEVTOOLS_PATTERNS', () => {
    it('should have MODULE_IMPORT pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.DEVTOOLS_PATTERNS.MODULE_IMPORT
      ).toBeInstanceOf(RegExp);
    });

    it('should have PROVIDER_FUNCTION pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.DEVTOOLS_PATTERNS.PROVIDER_FUNCTION
      ).toBeInstanceOf(RegExp);
    });

    it('should match StoreDevtoolsModule import', () => {
      const content = 'StoreDevtoolsModule.instrument({})';
      expect(
        NgRxDevToolsPatternConstants.DEVTOOLS_PATTERNS.MODULE_IMPORT.test(
          content
        )
      ).toBe(true);
    });

    it('should match provideStoreDevtools', () => {
      const content = 'provideStoreDevtools({ maxAge: 25 })';
      expect(
        NgRxDevToolsPatternConstants.DEVTOOLS_PATTERNS.PROVIDER_FUNCTION.test(
          content
        )
      ).toBe(true);
    });
  });

  describe('ENV_PATTERNS', () => {
    it('should have ENVIRONMENT_CHECK pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.ENVIRONMENT_CHECK
      ).toBeInstanceOf(RegExp);
    });

    it('should have PRODUCTION_CHECK pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.PRODUCTION_CHECK
      ).toBeInstanceOf(RegExp);
    });

    it('should have IS_DEV_MODE pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.IS_DEV_MODE
      ).toBeInstanceOf(RegExp);
    });

    it('should match environment.production', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.ENVIRONMENT_CHECK.test(
          'environment.production'
        )
      ).toBe(true);
    });

    it('should match !production', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.PRODUCTION_CHECK.test(
          '!production'
        )
      ).toBe(true);
    });

    it('should match isDevMode()', () => {
      expect(
        NgRxDevToolsPatternConstants.ENV_PATTERNS.IS_DEV_MODE.test(
          'isDevMode()'
        )
      ).toBe(true);
    });
  });

  describe('CONFIG_OPTIONS', () => {
    it('should have MAX_AGE pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.MAX_AGE
      ).toBeInstanceOf(RegExp);
    });

    it('should have LOG_ONLY pattern', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.LOG_ONLY
      ).toBeInstanceOf(RegExp);
    });

    it('should have NAME pattern', () => {
      expect(NgRxDevToolsPatternConstants.CONFIG_OPTIONS.NAME).toBeInstanceOf(
        RegExp
      );
    });

    it('should have TRACE pattern', () => {
      expect(NgRxDevToolsPatternConstants.CONFIG_OPTIONS.TRACE).toBeInstanceOf(
        RegExp
      );
    });

    it('should match maxAge option', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.MAX_AGE.test('maxAge: 25')
      ).toBe(true);
    });

    it('should match logOnly option', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.LOG_ONLY.test(
          'logOnly: true'
        )
      ).toBe(true);
    });

    it('should match name option', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.NAME.test("name: 'My App'")
      ).toBe(true);
    });

    it('should match trace option', () => {
      expect(
        NgRxDevToolsPatternConstants.CONFIG_OPTIONS.TRACE.test('trace: true')
      ).toBe(true);
    });
  });

  describe('VIOLATION_MESSAGES', () => {
    it('should have NOT_INSTALLED message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NOT_INSTALLED
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NOT_INSTALLED.length
      ).toBeGreaterThan(0);
    });

    it('should have NOT_CONFIGURED message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NOT_CONFIGURED
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NOT_CONFIGURED.length
      ).toBeGreaterThan(0);
    });

    it('should have NO_ENV_CHECK message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NO_ENV_CHECK
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.NO_ENV_CHECK.length
      ).toBeGreaterThan(0);
    });

    it('should have MISSING_OPTIONS message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.MISSING_OPTIONS
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.VIOLATION_MESSAGES.MISSING_OPTIONS.length
      ).toBeGreaterThan(0);
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    it('should have INSTALL_PACKAGE message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.INSTALL_PACKAGE
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.INSTALL_PACKAGE.length
      ).toBeGreaterThan(0);
    });

    it('should have ADD_MODULE message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_MODULE
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_MODULE.length
      ).toBeGreaterThan(0);
    });

    it('should have ADD_ENV_CHECK message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_ENV_CHECK
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_ENV_CHECK.length
      ).toBeGreaterThan(0);
    });

    it('should have ADD_OPTIONS message', () => {
      expect(
        typeof NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_OPTIONS
      ).toBe('string');
      expect(
        NgRxDevToolsPatternConstants.SUGGESTION_MESSAGES.ADD_OPTIONS.length
      ).toBeGreaterThan(0);
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have NOT_INSTALLED = 40', () => {
      expect(NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NOT_INSTALLED).toBe(
        40
      );
    });

    it('should have NOT_CONFIGURED = 30', () => {
      expect(NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NOT_CONFIGURED).toBe(
        30
      );
    });

    it('should have NO_ENV_CHECK = 20', () => {
      expect(NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NO_ENV_CHECK).toBe(
        20
      );
    });

    it('should have MISSING_OPTIONS = 10', () => {
      expect(
        NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.MISSING_OPTIONS
      ).toBe(10);
    });

    it('should have total deductions equal to 100', () => {
      const total =
        NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NOT_INSTALLED +
        NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NOT_CONFIGURED +
        NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.NO_ENV_CHECK +
        NgRxDevToolsPatternConstants.SCORE_DEDUCTIONS.MISSING_OPTIONS;
      expect(total).toBe(100);
    });
  });

  describe('hasDevToolsIntegration', () => {
    it('should return true for StoreDevtoolsModule', () => {
      const content = 'StoreDevtoolsModule.instrument({ maxAge: 25 })';
      expect(NgRxDevToolsPatternConstants.hasDevToolsIntegration(content)).toBe(
        true
      );
    });

    it('should return true for provideStoreDevtools', () => {
      const content = 'provideStoreDevtools({ maxAge: 25 })';
      expect(NgRxDevToolsPatternConstants.hasDevToolsIntegration(content)).toBe(
        true
      );
    });

    it('should return false for content without devtools', () => {
      const content = 'provideStore({ users: userReducer })';
      expect(NgRxDevToolsPatternConstants.hasDevToolsIntegration(content)).toBe(
        false
      );
    });
  });

  describe('hasEnvironmentCondition', () => {
    it('should return true for environment.production check', () => {
      const content = '!environment.production';
      expect(
        NgRxDevToolsPatternConstants.hasEnvironmentCondition(content)
      ).toBe(true);
    });

    it('should return true for isDevMode() check', () => {
      const content = 'isDevMode()';
      expect(
        NgRxDevToolsPatternConstants.hasEnvironmentCondition(content)
      ).toBe(true);
    });

    it('should return true for production variable check', () => {
      const content = '!production';
      expect(
        NgRxDevToolsPatternConstants.hasEnvironmentCondition(content)
      ).toBe(true);
    });

    it('should return false for content without env check', () => {
      const content = 'provideStoreDevtools({ maxAge: 25 })';
      expect(
        NgRxDevToolsPatternConstants.hasEnvironmentCondition(content)
      ).toBe(false);
    });
  });

  describe('hasConfigOptions', () => {
    it('should return true for maxAge option with braces', () => {
      expect(
        NgRxDevToolsPatternConstants.hasConfigOptions('{ maxAge: 25 }')
      ).toBe(true);
    });

    it('should return true for logOnly option with braces', () => {
      expect(
        NgRxDevToolsPatternConstants.hasConfigOptions('{ logOnly: true }')
      ).toBe(true);
    });

    it('should return true for name option with braces', () => {
      expect(
        NgRxDevToolsPatternConstants.hasConfigOptions("{ name: 'App' }")
      ).toBe(true);
    });

    it('should return true for trace option with braces', () => {
      expect(
        NgRxDevToolsPatternConstants.hasConfigOptions('{ trace: false }')
      ).toBe(true);
    });

    it('should return true for multiple options', () => {
      const content = '{ maxAge: 25, logOnly: true }';
      expect(NgRxDevToolsPatternConstants.hasConfigOptions(content)).toBe(true);
    });

    it('should return false for empty config', () => {
      expect(NgRxDevToolsPatternConstants.hasConfigOptions('{ }')).toBe(false);
    });
  });
});
