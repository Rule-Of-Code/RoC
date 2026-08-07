/**
 * @fileoverview Tests for quality-assessment-utils.ts
 * @description Tests for QualityAssessmentUtils class
 */

import { QualityAssessmentUtils } from '../../src/utils/quality-assessment-utils';

describe('utils/quality-assessment-utils', () => {
  describe('QualityAssessmentUtils.assessQualityByPatterns', () => {
    const patterns = [
      /describe\(/,
      /it\(/,
      /expect\(/,
      /beforeEach\(/,
      /afterEach\(/,
      /jest\.mock/,
      /test\(/,
      /beforeAll\(/,
    ];

    describe('default thresholds', () => {
      it('should return comprehensive for 6+ matches', () => {
        const content = `
          describe('test', () => {
            beforeEach(() => {});
            afterEach(() => {});
            beforeAll(() => {});
            it('test', () => {
              expect(true).toBe(true);
            });
            jest.mock('module');
          });
        `;

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('comprehensive');
      });

      it('should return good for 4-5 matches', () => {
        const content = `
          describe('test', () => {
            beforeEach(() => {});
            it('test', () => {
              expect(true).toBe(true);
            });
          });
        `;

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('good');
      });

      it('should return basic for 2-3 matches', () => {
        const content = `
          describe('test', () => {
            it('test', () => {});
          });
        `;

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('basic');
      });

      it('should return minimal for 0-1 matches', () => {
        const content = `
          describe('test', () => {});
        `;

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('minimal');
      });

      it('should return minimal for empty content', () => {
        const result = QualityAssessmentUtils.assessQualityByPatterns(
          '',
          patterns
        );

        expect(result).toBe('minimal');
      });

      it('should return minimal for no matches', () => {
        const content = 'function hello() { return "world"; }';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('minimal');
      });
    });

    describe('custom thresholds', () => {
      it('should use custom comprehensive threshold', () => {
        const content = 'describe( it( expect( beforeEach(';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns,
          {
            comprehensive: 4,
          }
        );

        expect(result).toBe('comprehensive');
      });

      it('should use custom good threshold', () => {
        const content = 'describe( it(';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns,
          {
            good: 2,
          }
        );

        expect(result).toBe('good');
      });

      it('should use both custom thresholds', () => {
        const content = 'describe( it( expect(';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns,
          {
            comprehensive: 10,
            good: 3,
          }
        );

        expect(result).toBe('good');
      });

      it('should handle high thresholds gracefully', () => {
        const content = patterns.map((_, i) => `pattern${i}(`).join(' ');

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns,
          {
            comprehensive: 100,
            good: 50,
          }
        );

        expect(result).toBe('minimal');
      });
    });

    describe('edge cases', () => {
      it('should handle empty patterns array', () => {
        const result = QualityAssessmentUtils.assessQualityByPatterns(
          'any content',
          []
        );

        expect(result).toBe('minimal');
      });

      it('should count each pattern only once', () => {
        const content = 'describe( describe( describe(';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('minimal'); // Only one unique pattern match
      });

      it('should handle special regex characters in content', () => {
        const specialPatterns = [/\[test\]/, /\(value\)/];
        const content = '[test] (value)';

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          specialPatterns
        );

        expect(result).toBe('basic');
      });

      it('should handle multiline content', () => {
        const content = `
          line1
          describe('test', () => {
            it('works', () => {
              expect(1).toBe(1);
            });
          });
          line5
        `;

        const result = QualityAssessmentUtils.assessQualityByPatterns(
          content,
          patterns
        );

        expect(result).toBe('basic');
      });
    });
  });

  describe('QualityAssessmentUtils.assessQualityCustom', () => {
    const patterns = [/function/, /class/, /const/, /let/, /var/];

    const customLevels = {
      high: { threshold: 5, label: 'expert' },
      medium: { threshold: 3, label: 'intermediate' },
      low: { threshold: 1, label: 'beginner' },
      minimal: 'novice',
    };

    it('should return high label when meeting high threshold', () => {
      const content =
        'function f() {} class C {} const x = 1; let y = 2; var z = 3;';

      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        customLevels
      );

      expect(result).toBe('expert');
    });

    it('should return medium label when meeting medium threshold', () => {
      const content = 'function f() {} class C {} const x = 1;';

      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        customLevels
      );

      expect(result).toBe('intermediate');
    });

    it('should return low label when meeting low threshold', () => {
      const content = 'function f() {}';

      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        customLevels
      );

      expect(result).toBe('beginner');
    });

    it('should return minimal label when no patterns match', () => {
      const content = 'no keywords here';

      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        customLevels
      );

      expect(result).toBe('novice');
    });

    it('should return minimal label for empty content', () => {
      const result = QualityAssessmentUtils.assessQualityCustom(
        '',
        patterns,
        customLevels
      );

      expect(result).toBe('novice');
    });

    it('should handle different custom levels', () => {
      const levels = {
        high: { threshold: 3, label: 'A+' },
        medium: { threshold: 2, label: 'B' },
        low: { threshold: 1, label: 'C' },
        minimal: 'F',
      };

      const content = 'function a() {} class B {}';
      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        levels
      );

      expect(result).toBe('B');
    });

    it('should handle threshold of 1 for high', () => {
      const levels = {
        high: { threshold: 1, label: 'passed' },
        medium: { threshold: 0, label: 'partial' },
        low: { threshold: 0, label: 'minimal' },
        minimal: 'failed',
      };

      const content = 'function test() {}';
      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        levels
      );

      expect(result).toBe('passed');
    });

    it('should handle zero threshold for medium', () => {
      const levels = {
        high: { threshold: 10, label: 'impossible' },
        medium: { threshold: 0, label: 'always' },
        low: { threshold: 0, label: 'never' },
        minimal: 'minimal',
      };

      const content = '';
      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        levels
      );

      expect(result).toBe('always');
    });

    it('should prioritize higher thresholds', () => {
      const levels = {
        high: { threshold: 2, label: 'high' },
        medium: { threshold: 2, label: 'medium' },
        low: { threshold: 2, label: 'low' },
        minimal: 'minimal',
      };

      const content = 'function f() {} class C {}';
      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        levels
      );

      expect(result).toBe('high'); // High is checked first
    });

    it('should handle empty patterns array', () => {
      const result = QualityAssessmentUtils.assessQualityCustom(
        'content',
        [],
        customLevels
      );

      expect(result).toBe('novice');
    });

    it('should handle unicode labels', () => {
      const levels = {
        high: { threshold: 3, label: '⭐⭐⭐' },
        medium: { threshold: 2, label: '⭐⭐' },
        low: { threshold: 1, label: '⭐' },
        minimal: '❌',
      };

      const content = 'function f() {} class C {}';
      const result = QualityAssessmentUtils.assessQualityCustom(
        content,
        patterns,
        levels
      );

      expect(result).toBe('⭐⭐');
    });
  });

  describe('integration tests', () => {
    it('should work with real-world test file patterns', () => {
      const testFilePatterns = [
        /describe\s*\(/,
        /it\s*\(/,
        /test\s*\(/,
        /expect\s*\(/,
        /toBe\s*\(/,
        /toEqual\s*\(/,
        /beforeEach\s*\(/,
        /afterEach\s*\(/,
      ];

      const testFileContent = `
        describe('MyService', () => {
          beforeEach(() => {
            // setup
          });

          afterEach(() => {
            // cleanup
          });

          it('should do something', () => {
            expect(result).toBe(true);
            expect(data).toEqual({ key: 'value' });
          });

          test('another test', () => {
            expect(1 + 1).toBe(2);
          });
        });
      `;

      const result = QualityAssessmentUtils.assessQualityByPatterns(
        testFileContent,
        testFilePatterns
      );

      expect(result).toBe('comprehensive');
    });

    it('should work with code quality patterns', () => {
      const qualityPatterns = [
        /\/\*\*/, // JSDoc
        /\/\//, // Comments
        /export\s+/, // Exports
        /import\s+/, // Imports
        /interface\s+/, // Interfaces
        /type\s+/, // Types
      ];

      const codeContent = `
        /**
         * A well documented module
         */
        import { Something } from 'somewhere';

        // This is a comment
        export interface MyInterface {
          value: string;
        }

        export type MyType = string | number;
      `;

      const result = QualityAssessmentUtils.assessQualityByPatterns(
        codeContent,
        qualityPatterns
      );

      expect(result).toBe('comprehensive');
    });
  });
});
