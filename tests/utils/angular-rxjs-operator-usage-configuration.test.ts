/**
 * @fileoverview Tests for rxjs-operator-usage-configuration.ts
 * @description Tests for RxJS operator usage configuration utilities
 */

import { RxJSOperatorUsageConfiguration } from '../../src/utils/angular/rxjs-operator-usage';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/rxjs-operator-usage-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('rxjs-operator-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('OPERATOR_ANALYSIS_CONFIG', () => {
    it('should have checkFlatteningOperators enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_ANALYSIS_CONFIG
          .checkFlatteningOperators
      ).toBe(true);
    });

    it('should have checkDeprecatedOperators enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_ANALYSIS_CONFIG
          .checkDeprecatedOperators
      ).toBe(true);
    });

    it('should have checkTransformationOperators enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_ANALYSIS_CONFIG
          .checkTransformationOperators
      ).toBe(true);
    });

    it('should have enableAdvancedPatternChecks enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_ANALYSIS_CONFIG
          .enableAdvancedPatternChecks
      ).toBe(true);
    });

    it('should have strictErrorHandling enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_ANALYSIS_CONFIG
          .strictErrorHandling
      ).toBe(true);
    });
  });

  describe('NGRX_FILE_PATTERNS', () => {
    it('should have effectsSuffixes defined', () => {
      const suffixes =
        RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS.effectsSuffixes;

      expect(suffixes).toContain('.effects.');
      expect(suffixes).toContain('.effect.');
    });

    it('should have effectsKeywords defined', () => {
      const keywords =
        RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS.effectsKeywords;

      expect(keywords).toContain('effects');
    });

    it('should have fileExtensions defined', () => {
      const extensions =
        RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS.fileExtensions;

      expect(extensions).toContain('.ts');
    });

    it('should have requiredContent for NgRx files', () => {
      const required =
        RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS.requiredContent;

      expect(required).toContain('@Injectable');
      expect(required).toContain('Actions');
      expect(required).toContain('createEffect');
    });
  });

  describe('FLATTENING_OPERATORS_CONFIG', () => {
    it('should list all flattening operators', () => {
      const operators =
        RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG.operators;

      expect(operators).toContain('switchMap');
      expect(operators).toContain('mergeMap');
      expect(operators).toContain('concatMap');
      expect(operators).toContain('exhaustMap');
    });

    it('should list error handling operators', () => {
      const errorHandling =
        RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG
          .errorHandlingRequired;

      expect(errorHandling).toContain('catchError');
    });

    it('should list HTTP operations', () => {
      const httpOps =
        RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG
          .httpOperations;

      expect(httpOps).toContain('POST');
      expect(httpOps).toContain('PUT');
      expect(httpOps).toContain('DELETE');
    });

    it('should have recommendations for each HTTP method', () => {
      const recs =
        RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG
          .recommendations;

      expect(recs.POST).toBe('exhaustMap');
      expect(recs.PUT).toBe('exhaustMap');
      expect(recs.DELETE).toBe('concatMap');
      expect(recs.GET).toBe('switchMap');
    });
  });

  describe('DEPRECATED_OPERATORS_MAPPING', () => {
    it('should map deprecated "flatMap" to "mergeMap"', () => {
      const deprecated =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING.deprecated;

      expect(deprecated.flatMap).toBe('mergeMap');
    });

    it('should map deprecated "mapTo" to "map"', () => {
      const deprecated =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING.deprecated;

      expect(deprecated.mapTo).toBe('map');
    });

    it('should map deprecated "switchMapTo" to "switchMap"', () => {
      const deprecated =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING.deprecated;

      expect(deprecated.switchMapTo).toBe('switchMap');
    });

    it('should map deprecated "toPromise" to firstValueFrom', () => {
      const deprecated =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING.deprecated;

      expect(deprecated.toPromise).toContain('firstValueFrom');
    });

    it('should have warnings array', () => {
      const warnings =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING.warnings;

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Deprecated');
    });

    it('should have replacements mapping', () => {
      const replacements =
        RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING
          .replacements;

      expect(replacements.flatMap).toBe('mergeMap');
      expect(replacements.mapTo).toBe('map');
    });
  });

  describe('TRANSFORMATION_OPERATORS_CONFIG', () => {
    it('should list transformation operators', () => {
      const operators =
        RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG
          .operators;

      expect(operators).toContain('map');
      expect(operators).toContain('filter');
      expect(operators).toContain('tap');
    });

    it('should require pipe syntax', () => {
      expect(
        RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG
          .pipeRequired
      ).toBe(true);
    });

    it('should list deprecated transformation operators', () => {
      const deprecated =
        RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG
          .deprecatedOperators;

      expect(deprecated).toContain('pluck');
    });
  });

  describe('isNgRxEffectsFile', () => {
    it('should detect .effects.ts file', () => {
      const result =
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.effects.ts');

      expect(result).toBe(true);
    });

    it('should detect .effect.ts file', () => {
      const result =
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('auth.effect.ts');

      expect(result).toBe(true);
    });

    it('should return false for non-effects file', () => {
      const result =
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.service.ts');

      expect(result).toBe(false);
    });

    it('should return false for component file', () => {
      const result =
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.component.ts');

      expect(result).toBe(false);
    });

    it('should handle full path', () => {
      const result = RxJSOperatorUsageConfiguration.isNgRxEffectsFile(
        'src/app/store/user.effects.ts'
      );

      expect(result).toBe(true);
    });
  });

  describe('FILE_READING_CONFIG', () => {
    it('should have encoding set to utf8', () => {
      expect(RxJSOperatorUsageConfiguration.FILE_READING_CONFIG.encoding).toBe(
        'utf8'
      );
    });

    it('should have fallbackToEmpty set', () => {
      expect(
        RxJSOperatorUsageConfiguration.FILE_READING_CONFIG.fallbackToEmpty
      ).toBe(false);
    });

    it('should have skipEmptyFiles enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.FILE_READING_CONFIG.skipEmptyFiles
      ).toBe(true);
    });

    it('should have handleErrors enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.FILE_READING_CONFIG.handleErrors
      ).toBe(true);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have validation messages defined', () => {
      const messages = RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES;

      expect(messages).toBeDefined();
    });

    it('should have SWITCH_MAP_WITHOUT_ERROR_HANDLING message', () => {
      expect(
        RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
          .SWITCH_MAP_WITHOUT_ERROR_HANDLING
      ).toContain('switchMap');
    });

    it('should have DEPRECATED_OPERATOR_FOUND message', () => {
      expect(
        RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
          .DEPRECATED_OPERATOR_FOUND
      ).toContain('Deprecated');
    });

    it('should have ADD_ERROR_HANDLING message', () => {
      expect(
        RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.ADD_ERROR_HANDLING
      ).toContain('catchError');
    });

    it('should have USE_PIPE_METHOD message', () => {
      expect(
        RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.USE_PIPE_METHOD
      ).toContain('pipe');
    });

    it('should have REPLACE_DEPRECATED message', () => {
      expect(
        RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.REPLACE_DEPRECATED
      ).toContain('Replace');
    });
  });

  describe('OPERATOR_RECOMMENDATIONS', () => {
    it('should have FLATTENING_BEST_PRACTICES', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
          .FLATTENING_BEST_PRACTICES
      ).toContain('switchMap');
    });

    it('should have ERROR_HANDLING_IMPORTANCE', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
          .ERROR_HANDLING_IMPORTANCE
      ).toContain('catchError');
    });

    it('should have MODERN_OPERATOR_USAGE', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
          .MODERN_OPERATOR_USAGE
      ).toContain('modern');
    });

    it('should have PIPE_OPERATOR_PATTERN', () => {
      expect(
        RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
          .PIPE_OPERATOR_PATTERN
      ).toContain('pipe');
    });
  });

  describe('DIRECTORY_FILTER_CONFIG', () => {
    it('should have skip directories defined', () => {
      const skipDirs =
        RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG.skipDirectories;

      expect(skipDirs).toContain('node_modules');
      expect(skipDirs).toContain('dist');
      expect(skipDirs).toContain('.git');
    });

    it('should have include directories defined', () => {
      const includeDirs =
        RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG
          .includeDirectories;

      expect(includeDirs).toContain('src');
      expect(includeDirs).toContain('effects');
      expect(includeDirs).toContain('store');
    });

    it('should have recursiveSearch enabled', () => {
      expect(
        RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG.recursiveSearch
      ).toBe(true);
    });
  });

  describe('ANALYSIS_THRESHOLDS', () => {
    it('should define maxFlatteningOperatorsPerEffect', () => {
      expect(
        RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
          .maxFlatteningOperatorsPerEffect
      ).toBe(3);
    });

    it('should define minErrorHandlingCoverage', () => {
      expect(
        RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
          .minErrorHandlingCoverage
      ).toBe(0.8);
    });

    it('should define deprecatedOperatorTolerance', () => {
      expect(
        RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
          .deprecatedOperatorTolerance
      ).toBe(0);
    });
  });

  describe('shouldSkipDirectory', () => {
    it('should return true for node_modules', () => {
      const result =
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('node_modules');

      expect(result).toBe(true);
    });

    it('should return true for dist', () => {
      const result = RxJSOperatorUsageConfiguration.shouldSkipDirectory('dist');

      expect(result).toBe(true);
    });

    it('should return true for .git', () => {
      const result = RxJSOperatorUsageConfiguration.shouldSkipDirectory('.git');

      expect(result).toBe(true);
    });

    it('should return false for src', () => {
      const result = RxJSOperatorUsageConfiguration.shouldSkipDirectory('src');

      expect(result).toBe(false);
    });

    it('should return false for app', () => {
      const result = RxJSOperatorUsageConfiguration.shouldSkipDirectory('app');

      expect(result).toBe(false);
    });
  });

  describe('getOperatorReplacement', () => {
    it('should return mergeMap for deprecated flatMap', () => {
      const result =
        RxJSOperatorUsageConfiguration.getOperatorReplacement('flatMap');

      expect(result).toBe('mergeMap');
    });

    it('should return map for deprecated mapTo', () => {
      const result =
        RxJSOperatorUsageConfiguration.getOperatorReplacement('mapTo');

      expect(result).toBe('map');
    });

    it('should return switchMap for deprecated switchMapTo', () => {
      const result =
        RxJSOperatorUsageConfiguration.getOperatorReplacement('switchMapTo');

      expect(result).toBe('switchMap');
    });

    it('should return same operator for non-deprecated operator', () => {
      const result =
        RxJSOperatorUsageConfiguration.getOperatorReplacement('map');

      expect(result).toBe('map');
    });
  });

  describe('buildMessage', () => {
    it('should format message with placeholder', () => {
      const template = 'Error in {0}';
      const result = RxJSOperatorUsageConfiguration.buildMessage(
        template,
        'test.effects.ts'
      );

      expect(result).toBe('Error in test.effects.ts');
    });

    it('should format message with multiple placeholders', () => {
      const template = "Replace '{0}' with '{1}'";
      const result = RxJSOperatorUsageConfiguration.buildMessage(
        template,
        'do',
        'tap'
      );

      expect(result).toBe("Replace 'do' with 'tap'");
    });
  });
});
