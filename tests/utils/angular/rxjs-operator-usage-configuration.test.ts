/**
 * @fileoverview Tests for rxjs-operator-usage-configuration.ts
 * @description Tests for RxJS Operator Usage Configuration utilities
 */

import { RxJSOperatorUsageConfiguration } from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-usage-configuration';
import {
  ANGULAR_CONSTANTS,
  DIRECTORY_NAMES,
} from '../../../src/utils/constants';

describe('utils/angular/rxjs-operator-usage/rxjs-operator-usage-configuration', () => {
  describe('static configuration properties', () => {
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
      it('should have effects suffixes', () => {
        const { effectsSuffixes } =
          RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS;
        expect(effectsSuffixes).toContain(ANGULAR_CONSTANTS.EFFECTS_SUFFIX);
        expect(effectsSuffixes).toContain(ANGULAR_CONSTANTS.EFFECT_SUFFIX);
      });

      it('should have effects keywords', () => {
        const { effectsKeywords } =
          RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS;
        expect(effectsKeywords).toContain(ANGULAR_CONSTANTS.EFFECTS);
      });

      it('should have file extensions', () => {
        const { fileExtensions } =
          RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS;
        expect(fileExtensions).toContain(ANGULAR_CONSTANTS.TS_EXTENSION);
      });

      it('should have required content patterns', () => {
        const { requiredContent } =
          RxJSOperatorUsageConfiguration.NGRX_FILE_PATTERNS;
        expect(requiredContent).toContain('@Injectable');
        expect(requiredContent).toContain('Actions');
        expect(requiredContent).toContain('createEffect');
      });
    });

    describe('FLATTENING_OPERATORS_CONFIG', () => {
      it('should have flattening operators', () => {
        const { operators } =
          RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG;
        expect(operators).toContain(ANGULAR_CONSTANTS.SWITCH_MAP);
        expect(operators).toContain('mergeMap');
        expect(operators).toContain('concatMap');
        expect(operators).toContain(ANGULAR_CONSTANTS.EXHAUST_MAP);
      });

      it('should have error handling operators', () => {
        const { errorHandlingRequired } =
          RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG;
        expect(errorHandlingRequired).toContain(ANGULAR_CONSTANTS.CATCH_ERROR);
        expect(errorHandlingRequired).toContain('catchError');
      });

      it('should have HTTP operations defined', () => {
        const { httpOperations } =
          RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG;
        expect(httpOperations).toContain(ANGULAR_CONSTANTS.HTTP_POST);
        expect(httpOperations).toContain(ANGULAR_CONSTANTS.HTTP_PUT);
        expect(httpOperations).toContain(ANGULAR_CONSTANTS.HTTP_DELETE);
        expect(httpOperations).toContain('http.post');
        expect(httpOperations).toContain('http.put');
        expect(httpOperations).toContain('http.delete');
      });

      it('should have recommendations for HTTP methods', () => {
        const { recommendations } =
          RxJSOperatorUsageConfiguration.FLATTENING_OPERATORS_CONFIG;
        expect(recommendations.POST).toBe(ANGULAR_CONSTANTS.EXHAUST_MAP);
        expect(recommendations.PUT).toBe(ANGULAR_CONSTANTS.EXHAUST_MAP);
        expect(recommendations.DELETE).toBe('concatMap');
        expect(recommendations.GET).toBe(ANGULAR_CONSTANTS.SWITCH_MAP);
      });
    });

    describe('DEPRECATED_OPERATORS_MAPPING', () => {
      it('should have modern deprecated operators defined', () => {
        const { deprecated } =
          RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING;
        expect(deprecated.flatMap).toBe('mergeMap');
        expect(deprecated.mapTo).toBe('map');
        expect(deprecated.switchMapTo).toBe('switchMap');
        expect(deprecated.toPromise).toContain('firstValueFrom');
      });

      it('should have warnings', () => {
        const { warnings } =
          RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING;
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0]).toContain('Deprecated');
      });

      it('should have replacements matching deprecated', () => {
        const { deprecated, replacements } =
          RxJSOperatorUsageConfiguration.DEPRECATED_OPERATORS_MAPPING;
        expect(replacements.flatMap).toBe(deprecated.flatMap);
        expect(replacements.mapTo).toBe(deprecated.mapTo);
      });
    });

    describe('TRANSFORMATION_OPERATORS_CONFIG', () => {
      it('should have transformation operators', () => {
        const { operators } =
          RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG;
        expect(operators).toContain(ANGULAR_CONSTANTS.MAP);
        expect(operators).toContain('filter');
        expect(operators).toContain(ANGULAR_CONSTANTS.TAP);
        expect(operators).toContain(ANGULAR_CONSTANTS.PLUCK);
      });

      it('should require pipe', () => {
        expect(
          RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG
            .pipeRequired
        ).toBe(true);
      });

      it('should have deprecated operators list', () => {
        const { deprecatedOperators } =
          RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG;
        expect(deprecatedOperators).toContain(ANGULAR_CONSTANTS.PLUCK);
      });

      it('should have modern alternatives for deprecated operators', () => {
        const { modernAlternatives } =
          RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG;
        expect(modernAlternatives[ANGULAR_CONSTANTS.PLUCK]).toBe(
          ANGULAR_CONSTANTS.MAP
        );
      });

      it('should have pipe syntax defined', () => {
        expect(
          RxJSOperatorUsageConfiguration.TRANSFORMATION_OPERATORS_CONFIG
            .pipeSyntax
        ).toBe(ANGULAR_CONSTANTS.PIPE_SYNTAX);
      });
    });

    describe('DIRECTORY_FILTER_CONFIG', () => {
      it('should have skip directories', () => {
        const { skipDirectories } =
          RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG;
        expect(skipDirectories).toContain(DIRECTORY_NAMES.NODE_MODULES);
        expect(skipDirectories).toContain(DIRECTORY_NAMES.DIST);
        expect(skipDirectories).toContain(DIRECTORY_NAMES.GIT);
        expect(skipDirectories).toContain(DIRECTORY_NAMES.COVERAGE);
        expect(skipDirectories).toContain(DIRECTORY_NAMES.NX);
        expect(skipDirectories).toContain('.angular');
        expect(skipDirectories).toContain('tmp');
      });

      it('should have include directories', () => {
        const { includeDirectories } =
          RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG;
        expect(includeDirectories).toContain(DIRECTORY_NAMES.SRC);
        expect(includeDirectories).toContain(DIRECTORY_NAMES.APP);
        expect(includeDirectories).toContain('effects');
        expect(includeDirectories).toContain('store');
      });

      it('should have recursive search enabled', () => {
        expect(
          RxJSOperatorUsageConfiguration.DIRECTORY_FILTER_CONFIG.recursiveSearch
        ).toBe(true);
      });
    });

    describe('FILE_READING_CONFIG', () => {
      it('should have encoding set to utf8', () => {
        expect(
          RxJSOperatorUsageConfiguration.FILE_READING_CONFIG.encoding
        ).toBe(ANGULAR_CONSTANTS.ENCODING_UTF8);
      });

      it('should have fallbackToEmpty disabled', () => {
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

    describe('ANALYSIS_THRESHOLDS', () => {
      it('should have maxFlatteningOperatorsPerEffect', () => {
        expect(
          RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
            .maxFlatteningOperatorsPerEffect
        ).toBe(3);
      });

      it('should have minErrorHandlingCoverage at 80%', () => {
        expect(
          RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
            .minErrorHandlingCoverage
        ).toBe(0.8);
      });

      it('should have deprecatedOperatorTolerance at 0', () => {
        expect(
          RxJSOperatorUsageConfiguration.ANALYSIS_THRESHOLDS
            .deprecatedOperatorTolerance
        ).toBe(0);
      });
    });

    describe('OPERATOR_RECOMMENDATIONS', () => {
      it('should have flattening best practices', () => {
        expect(
          RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
            .FLATTENING_BEST_PRACTICES
        ).toContain('switchMap');
        expect(
          RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
            .FLATTENING_BEST_PRACTICES
        ).toContain('exhaustMap');
      });

      it('should have error handling importance', () => {
        expect(
          RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
            .ERROR_HANDLING_IMPORTANCE
        ).toContain('catchError');
      });

      it('should have modern operator usage guidance', () => {
        expect(
          RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
            .MODERN_OPERATOR_USAGE
        ).toContain('deprecated');
      });

      it('should have pipe operator pattern guidance', () => {
        expect(
          RxJSOperatorUsageConfiguration.OPERATOR_RECOMMENDATIONS
            .PIPE_OPERATOR_PATTERN
        ).toContain('pipe()');
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have SWITCH_MAP_WITHOUT_ERROR_HANDLING message', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .SWITCH_MAP_WITHOUT_ERROR_HANDLING
        ).toContain(ANGULAR_CONSTANTS.SWITCH_MAP);
      });

      it('should have DEPRECATED_OPERATOR_FOUND message template', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .DEPRECATED_OPERATOR_FOUND
        ).toContain('{0}');
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .DEPRECATED_OPERATOR_FOUND
        ).toContain('{1}');
      });

      it('should have OPERATOR_OUTSIDE_PIPE message template', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .OPERATOR_OUTSIDE_PIPE
        ).toContain(ANGULAR_CONSTANTS.PIPE);
      });

      it('should have DEPRECATED_PLUCK_USAGE message', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .DEPRECATED_PLUCK_USAGE
        ).toContain(ANGULAR_CONSTANTS.PLUCK);
      });

      it('should have RECOMMEND_EXHAUST_MAP message', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES
            .RECOMMEND_EXHAUST_MAP
        ).toContain(ANGULAR_CONSTANTS.EXHAUST_MAP);
      });

      it('should have ADD_ERROR_HANDLING message', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.ADD_ERROR_HANDLING
        ).toContain(ANGULAR_CONSTANTS.CATCH_ERROR);
      });

      it('should have USE_PIPE_METHOD message', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.USE_PIPE_METHOD
        ).toContain('pipe()');
      });

      it('should have REPLACE_DEPRECATED message template', () => {
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.REPLACE_DEPRECATED
        ).toContain('{0}');
        expect(
          RxJSOperatorUsageConfiguration.VALIDATION_MESSAGES.REPLACE_DEPRECATED
        ).toContain('{1}');
      });
    });
  });

  describe('buildMessage', () => {
    it('should format template with single placeholder', () => {
      const result = RxJSOperatorUsageConfiguration.buildMessage(
        'Error in {0}',
        'test.ts'
      );
      expect(result).toBe('Error in test.ts');
    });

    it('should format template with multiple placeholders', () => {
      const result = RxJSOperatorUsageConfiguration.buildMessage(
        '{0} found in {1}',
        'switchMap',
        'effects.ts'
      );
      expect(result).toBe('switchMap found in effects.ts');
    });

    it('should handle empty placeholders', () => {
      const result = RxJSOperatorUsageConfiguration.buildMessage(
        'Error in {0}',
        ''
      );
      expect(result).toBe('Error in ');
    });

    it('should return template unchanged when no placeholders provided', () => {
      const result =
        RxJSOperatorUsageConfiguration.buildMessage('Static message');
      expect(result).toBe('Static message');
    });
  });

  describe('isNgRxEffectsFile', () => {
    it('should return true for file with .effects.ts suffix', () => {
      expect(
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.effects.ts')
      ).toBe(true);
    });

    it('should return true for file with .effect.ts suffix', () => {
      expect(
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.effect.ts')
      ).toBe(true);
    });

    it('should return true for file with effects keyword', () => {
      expect(
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user-effects.ts')
      ).toBe(true);
    });

    it('should return false for non-effects TypeScript file', () => {
      expect(
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.component.ts')
      ).toBe(false);
    });

    it('should return false for effects file without .ts extension', () => {
      expect(
        RxJSOperatorUsageConfiguration.isNgRxEffectsFile('user.effects.js')
      ).toBe(false);
    });

    it('should return false for empty filename', () => {
      expect(RxJSOperatorUsageConfiguration.isNgRxEffectsFile('')).toBe(false);
    });

    it('should return false for filename with only extension', () => {
      expect(RxJSOperatorUsageConfiguration.isNgRxEffectsFile('.ts')).toBe(
        false
      );
    });
  });

  describe('shouldSkipDirectory', () => {
    it('should return true for node_modules', () => {
      expect(
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('node_modules')
      ).toBe(true);
    });

    it('should return true for dist', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('dist')).toBe(
        true
      );
    });

    it('should return true for .git', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('.git')).toBe(
        true
      );
    });

    it('should return true for coverage', () => {
      expect(
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('coverage')
      ).toBe(true);
    });

    it('should return true for .nx', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('.nx')).toBe(
        true
      );
    });

    it('should return true for .angular', () => {
      expect(
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('.angular')
      ).toBe(true);
    });

    it('should return true for tmp', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('tmp')).toBe(
        true
      );
    });

    it('should return false for src directory', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('src')).toBe(
        false
      );
    });

    it('should return false for app directory', () => {
      expect(RxJSOperatorUsageConfiguration.shouldSkipDirectory('app')).toBe(
        false
      );
    });

    it('should return false for effects directory', () => {
      expect(
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('effects')
      ).toBe(false);
    });

    it('should return false for custom directory', () => {
      expect(
        RxJSOperatorUsageConfiguration.shouldSkipDirectory('my-feature')
      ).toBe(false);
    });
  });

  describe('getOperatorReplacement', () => {
    it('should return mergeMap for deprecated flatMap operator', () => {
      expect(
        RxJSOperatorUsageConfiguration.getOperatorReplacement('flatMap')
      ).toBe('mergeMap');
    });

    it('should return map for deprecated mapTo operator', () => {
      expect(
        RxJSOperatorUsageConfiguration.getOperatorReplacement('mapTo')
      ).toBe('map');
    });

    it('should return switchMap for deprecated switchMapTo operator', () => {
      expect(
        RxJSOperatorUsageConfiguration.getOperatorReplacement('switchMapTo')
      ).toBe('switchMap');
    });

    it('should return the same operator if not in deprecated mapping', () => {
      expect(
        RxJSOperatorUsageConfiguration.getOperatorReplacement('someOperator')
      ).toBe('someOperator');
    });

    it('should return the same operator for modern operators', () => {
      expect(RxJSOperatorUsageConfiguration.getOperatorReplacement('map')).toBe(
        'map'
      );
    });

    it('should return the same operator for empty string', () => {
      expect(RxJSOperatorUsageConfiguration.getOperatorReplacement('')).toBe(
        ''
      );
    });
  });

  describe('validateProjectConfig', () => {
    it('should return valid for non-empty project root', () => {
      const result = RxJSOperatorUsageConfiguration.validateProjectConfig(
        '/path/to/project',
        {} as any
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should return invalid for empty project root', () => {
      const result = RxJSOperatorUsageConfiguration.validateProjectConfig(
        '',
        {} as any
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project root path is required');
    });

    it('should return error array for missing project root', () => {
      const result = RxJSOperatorUsageConfiguration.validateProjectConfig(
        '',
        {} as any
      );
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return empty warnings array', () => {
      const result = RxJSOperatorUsageConfiguration.validateProjectConfig(
        '/project',
        {} as any
      );
      expect(result.warnings).toEqual([]);
    });
  });
});
