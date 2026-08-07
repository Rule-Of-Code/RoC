/**
 * @fileoverview Tests for ngrx-selector-patterns-configuration.ts
 * @description Tests for NgRx Selector Patterns Configuration utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxSelectorPatternsConfiguration } from '../../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-configuration';
import { DIRECTORY_NAMES, NGRX_KEYWORDS } from '../../../src/utils/constants';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';
import { PathOperations } from '../../../src/utils/path-operations';
import { StringTemplateUtils } from '../../../src/utils/string-template-utils';

describe('utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-configuration', () => {
  const mockConfig = {
    project: {
      name: 'test-project',
      componentPrefix: 'app',
      type: 'angular',
    },
    ignores: {
      global: ['node_modules', 'dist'],
    },
  } as unknown as RuleOfCodeConfig;

  describe('NgRxSelectorPatternsConfiguration', () => {
    describe('SELECTOR_ANALYSIS_CONFIG', () => {
      it('should have checkNamingConventions enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .checkNamingConventions
        ).toBe(true);
      });

      it('should have checkMemoization enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .checkMemoization
        ).toBe(true);
      });

      it('should have checkParameterUsage enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .checkParameterUsage
        ).toBe(true);
      });

      it('should have checkReusability enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .checkReusability
        ).toBe(true);
      });

      it('should have checkPropsSelectors enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .checkPropsSelectors
        ).toBe(true);
      });

      it('should have enableAdvancedPatterns enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
            .enableAdvancedPatterns
        ).toBe(true);
      });
    });

    describe('SELECTOR_VALIDATION_PATTERNS', () => {
      it('should have createSelectorPattern regex', () => {
        const patterns =
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS;

        expect(patterns.createSelectorPattern).toBeInstanceOf(RegExp);
      });

      it('should have parameterPattern regex', () => {
        const patterns =
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS;

        expect(patterns.parameterPattern).toBeInstanceOf(RegExp);
      });

      it('should have duplicateLogicPattern regex', () => {
        const patterns =
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS;

        expect(patterns.duplicateLogicPattern).toBeInstanceOf(RegExp);
      });

      it('should have propsPattern regex', () => {
        const patterns =
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS;

        expect(patterns.propsPattern).toBeInstanceOf(RegExp);
      });

      it('should have stateParameterPattern regex', () => {
        const patterns =
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS;

        expect(patterns.stateParameterPattern).toBeInstanceOf(RegExp);
      });
    });

    describe('SELECTOR_FILE_SETTINGS', () => {
      it('should have fileExtensions array', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_FILE_SETTINGS
            .fileExtensions
        ).toContain('.ts');
      });

      it('should have selectorSuffix set correctly', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_FILE_SETTINGS
            .selectorSuffix
        ).toBe('.selectors');
      });

      it('should have encoding defined', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_FILE_SETTINGS.encoding
        ).toBeDefined();
      });

      it('should have fallbackToEmpty enabled', () => {
        expect(
          NgRxSelectorPatternsConfiguration.SELECTOR_FILE_SETTINGS
            .fallbackToEmpty
        ).toBe(true);
      });
    });

    describe('ANALYSIS_THRESHOLDS', () => {
      it('should have duplicateLogicThreshold', () => {
        expect(
          NgRxSelectorPatternsConfiguration.ANALYSIS_THRESHOLDS
            .duplicateLogicThreshold
        ).toBe(3);
      });

      it('should have minSelectorsPerFile', () => {
        expect(
          NgRxSelectorPatternsConfiguration.ANALYSIS_THRESHOLDS
            .minSelectorsPerFile
        ).toBe(1);
      });

      it('should have maxParametersPerSelector', () => {
        expect(
          NgRxSelectorPatternsConfiguration.ANALYSIS_THRESHOLDS
            .maxParametersPerSelector
        ).toBe(4);
      });

      it('should have complexityThreshold', () => {
        expect(
          NgRxSelectorPatternsConfiguration.ANALYSIS_THRESHOLDS
            .complexityThreshold
        ).toBe(10);
      });
    });

    describe('VALIDATION_MESSAGES_CONFIG', () => {
      it('should have MISSING_CREATE_SELECTOR template', () => {
        expect(
          NgRxSelectorPatternsConfiguration.VALIDATION_MESSAGES_CONFIG
            .MISSING_CREATE_SELECTOR
        ).toContain('{0}');
      });

      it('should have PARAMETER_USAGE_SUGGESTION template', () => {
        expect(
          NgRxSelectorPatternsConfiguration.VALIDATION_MESSAGES_CONFIG
            .PARAMETER_USAGE_SUGGESTION
        ).toContain('{0}');
      });

      it('should have REUSABILITY_SUGGESTION template', () => {
        expect(
          NgRxSelectorPatternsConfiguration.VALIDATION_MESSAGES_CONFIG
            .REUSABILITY_SUGGESTION
        ).toContain('{0}');
      });
    });

    describe('buildMessage', () => {
      let formatTemplateSpy: jest.SpyInstance;

      beforeEach(() => {
        formatTemplateSpy = jest.spyOn(StringTemplateUtils, 'formatTemplate');
      });

      afterEach(() => {
        formatTemplateSpy.mockRestore();
      });

      it('should format template with placeholder', () => {
        formatTemplateSpy.mockReturnValue('Test message for test.ts');

        const result = NgRxSelectorPatternsConfiguration.buildMessage(
          'Test message for {0}',
          'test.ts'
        );

        expect(formatTemplateSpy).toHaveBeenCalledWith(
          'Test message for {0}',
          'test.ts'
        );
        expect(result).toBe('Test message for test.ts');
      });

      it('should handle multiple placeholders', () => {
        formatTemplateSpy.mockReturnValue('File test.ts has selector');

        const result = NgRxSelectorPatternsConfiguration.buildMessage(
          'File {0} has {1}',
          'test.ts',
          'selector'
        );

        expect(formatTemplateSpy).toHaveBeenCalledWith(
          'File {0} has {1}',
          'test.ts',
          'selector'
        );
        expect(result).toBe('File test.ts has selector');
      });
    });

    describe('getSourcePath', () => {
      let joinSpy: jest.SpyInstance;
      let existsSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
        existsSpy.mockRestore();
      });

      it('should return source path when directory exists', () => {
        existsSpy.mockReturnValue(true);

        const result =
          NgRxSelectorPatternsConfiguration.getSourcePath('/test/project');

        expect(result).toBe(`/test/project/${DIRECTORY_NAMES.SRC}`);
      });

      it('should return null when src directory does not exist', () => {
        existsSpy.mockReturnValue(false);

        const result =
          NgRxSelectorPatternsConfiguration.getSourcePath('/test/project');

        expect(result).toBeNull();
      });
    });

    describe('getSelectorAnalysisConfig', () => {
      it('should return selector analysis configuration', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorAnalysisConfig(
            mockConfig
          );

        expect(result).toBe(
          NgRxSelectorPatternsConfiguration.SELECTOR_ANALYSIS_CONFIG
        );
      });

      it('should include all analysis options', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorAnalysisConfig(
            mockConfig
          );

        expect(result.checkNamingConventions).toBeDefined();
        expect(result.checkMemoization).toBeDefined();
        expect(result.checkParameterUsage).toBeDefined();
        expect(result.checkReusability).toBeDefined();
        expect(result.checkPropsSelectors).toBeDefined();
        expect(result.enableAdvancedPatterns).toBeDefined();
      });
    });

    describe('getSelectorValidationPatterns', () => {
      it('should return validation patterns', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorValidationPatterns();

        expect(result).toBe(
          NgRxSelectorPatternsConfiguration.SELECTOR_VALIDATION_PATTERNS
        );
      });

      it('should include all pattern regexes', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorValidationPatterns();

        expect(result.createSelectorPattern).toBeInstanceOf(RegExp);
        expect(result.parameterPattern).toBeInstanceOf(RegExp);
        expect(result.duplicateLogicPattern).toBeInstanceOf(RegExp);
        expect(result.propsPattern).toBeInstanceOf(RegExp);
        expect(result.stateParameterPattern).toBeInstanceOf(RegExp);
      });
    });

    describe('getSelectorFileSettings', () => {
      it('should return file settings', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorFileSettings();

        expect(result).toBe(
          NgRxSelectorPatternsConfiguration.SELECTOR_FILE_SETTINGS
        );
      });

      it('should have expected properties', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorFileSettings();

        expect(result.fileExtensions).toBeDefined();
        expect(result.selectorSuffix).toBeDefined();
        expect(result.encoding).toBeDefined();
        expect(result.fallbackToEmpty).toBeDefined();
      });
    });

    describe('getAnalysisThresholds', () => {
      it('should return analysis thresholds', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getAnalysisThresholds();

        expect(result).toBe(
          NgRxSelectorPatternsConfiguration.ANALYSIS_THRESHOLDS
        );
      });

      it('should have all threshold values', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getAnalysisThresholds();

        expect(result.duplicateLogicThreshold).toBeDefined();
        expect(result.minSelectorsPerFile).toBeDefined();
        expect(result.maxParametersPerSelector).toBeDefined();
        expect(result.complexityThreshold).toBeDefined();
      });
    });

    describe('getValidationMessages', () => {
      it('should return validation messages with functions', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getValidationMessages();

        expect(typeof result.MISSING_CREATE_SELECTOR).toBe('function');
        expect(typeof result.PARAMETER_USAGE_SUGGESTION).toBe('function');
        expect(typeof result.REUSABILITY_SUGGESTION).toBe('function');
        expect(typeof result.PROPS_WITHOUT_CREATE_SELECTOR).toBe('function');
        expect(typeof result.PROPS_WITH_CREATE_SELECTOR_SUGGESTION).toBe(
          'function'
        );
      });

      it('should have static suggestion message', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getValidationMessages();

        expect(typeof result.CREATE_SELECTOR_FILES_SUGGESTION).toBe('string');
      });

      it('should format MISSING_CREATE_SELECTOR with filename', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getValidationMessages();

        const message = result.MISSING_CREATE_SELECTOR('test.ts');

        expect(message).toContain('test.ts');
      });
    });

    describe('getSelectorRecommendations', () => {
      it('should return recommendations with functions', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorRecommendations();

        expect(typeof result.USE_CREATE_SELECTOR).toBe('function');
      });

      it('should have static recommendation messages', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorRecommendations();

        expect(typeof result.MEMOIZATION_BENEFITS).toBe('string');
        expect(typeof result.FEATURE_SELECTOR_PATTERN).toBe('string');
        expect(typeof result.COMPOSITION_BENEFITS).toBe('string');
      });

      it('should format USE_CREATE_SELECTOR with filename', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getSelectorRecommendations();

        const message = result.USE_CREATE_SELECTOR('test.ts');

        expect(message).toContain('test.ts');
      });
    });

    describe('validateProjectConfig', () => {
      let joinSpy: jest.SpyInstance;
      let existsSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
        existsSpy.mockRestore();
      });

      it('should return valid result when src exists', () => {
        existsSpy.mockReturnValue(true);

        const result = NgRxSelectorPatternsConfiguration.validateProjectConfig(
          '/test/project',
          mockConfig
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should add warning when src directory does not exist', () => {
        existsSpy.mockReturnValue(false);

        const result = NgRxSelectorPatternsConfiguration.validateProjectConfig(
          '/test/project',
          mockConfig
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Source directory not found');
      });

      it('should return errors for empty project root', () => {
        existsSpy.mockReturnValue(false);

        const result = NgRxSelectorPatternsConfiguration.validateProjectConfig(
          '',
          mockConfig
        );

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('containsPattern', () => {
      it('should detect createSelector pattern', () => {
        const content = `export const selectItems = ${NGRX_KEYWORDS.CREATE_SELECTOR}(...);`;

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'createSelector'
        );

        expect(result).toBe(true);
      });

      it('should return false when createSelector not present', () => {
        const content = 'export const selectItems = state => state.items;';

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'createSelector'
        );

        expect(result).toBe(false);
      });

      it('should detect props pattern', () => {
        const content = `export const selectItem = ${NGRX_KEYWORDS.PROPS}<{id: number}>();`;

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'props'
        );

        expect(result).toBe(true);
      });

      it('should detect parameters pattern', () => {
        const content = 'const selector = (state) => state.items;';

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'parameters'
        );

        expect(result).toBe(true);
      });

      it('should detect duplicate logic pattern when exceeds threshold', () => {
        const content =
          'state?.user?.name && state?.user?.email && state?.user?.id && state?.user?.role';

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'duplicateLogic'
        );

        expect(result).toBe(true);
      });

      it('should return false for unknown pattern type', () => {
        const content = 'any content';

        const result = NgRxSelectorPatternsConfiguration.containsPattern(
          content,
          'unknown'
        );

        expect(result).toBe(false);
      });
    });

    describe('getFileReadingConfig', () => {
      it('should return file reading configuration', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getFileReadingConfig(mockConfig);

        expect(result.encoding).toBeDefined();
        expect(result.fallbackToEmpty).toBeDefined();
        expect(result.skipEmptyFiles).toBeDefined();
      });

      it('should have skipEmptyFiles enabled', () => {
        const result =
          NgRxSelectorPatternsConfiguration.getFileReadingConfig(mockConfig);

        expect(result.skipEmptyFiles).toBe(true);
      });
    });
  });
});
