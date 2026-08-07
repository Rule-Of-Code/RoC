/**
 * @fileoverview Tests for result-builder.ts
 * @description Tests for ResultBuilder utility class
 */

import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import {
  ResultBuilder,
  ResultBuilderOptions,
} from '../../src/utils/result-builder';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('utils/result-builder', () => {
  const mockConfig = createConfig();

  describe('ResultBuilder.create', () => {
    describe('passing results', () => {
      it('should create passing result when no violations', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test Law',
          type: 'TypeScript',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
        expect(result.message).toContain('✅');
        expect(result.message).toContain('TypeScript verified');
        expect(result.fixable).toBe(false);
      });

      it('should include default details for passing result', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Config Check',
          type: 'Configuration',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.details).toContain(
          'Configuration is properly configured'
        );
      });

      it('should use provided suggestions as details when passing', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test',
          type: 'Code',
          suggestions: ['Consider adding more tests'],
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.details).toContain('Consider adding more tests');
      });

      it('should include lawName in result', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test',
          type: 'Code',
          lawName: 'law-001',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.lawName).toBe('law-001');
      });

      it('should include metrics in result', () => {
        const metrics = { fileCount: 10, lineCount: 500 };
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test',
          type: 'Metrics',
          metrics,
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.metrics).toEqual(metrics);
      });
    });

    describe('failing results', () => {
      it('should create failing result with violations', () => {
        const options: ResultBuilderOptions = {
          violations: ['Missing semicolon', 'Unused variable'],
          title: 'main.ts',
          type: 'ESLint',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.passed).toBe(false);
        expect(result.message).toContain('❌');
        expect(result.message).toContain('2 ESLint violations');
        expect(result.violations).toHaveLength(2);
      });

      it('should use singular form for single violation', () => {
        const options: ResultBuilderOptions = {
          violations: ['Single error'],
          title: 'test.ts',
          type: 'TypeScript',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.message).toContain('1 TypeScript violation in');
        expect(result.message).not.toContain('violations');
      });

      it('should calculate score based on violations', () => {
        const options: ResultBuilderOptions = {
          violations: ['Error 1', 'Error 2', 'Error 3'],
          title: 'Test',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.score).toBe(70); // 100 - 3 * 10
      });

      it('should not go below 0 score', () => {
        const violations = Array(15).fill('Error');
        const options: ResultBuilderOptions = {
          violations,
          title: 'Test',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.score).toBe(0);
      });

      it('should be fixable when suggestions provided', () => {
        const options: ResultBuilderOptions = {
          violations: ['Error found'],
          title: 'Test',
          type: 'Code',
          suggestions: ['Run eslint --fix'],
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.fixable).toBe(true);
        expect(result.suggestions).toContain('Run eslint --fix');
      });

      it('should not be fixable without suggestions', () => {
        const options: ResultBuilderOptions = {
          violations: ['Critical error'],
          title: 'Test',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.fixable).toBe(false);
      });

      it('should combine violations and suggestions in details', () => {
        const options: ResultBuilderOptions = {
          violations: ['Error 1', 'Error 2'],
          title: 'Test',
          type: 'Code',
          suggestions: ['Fix suggestion'],
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.details).toContain('Error 1');
        expect(result.details).toContain('Error 2');
        expect(result.details).toContain('Fix suggestion');
        expect(result.details).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings in violations', () => {
        const options: ResultBuilderOptions = {
          violations: [''],
          title: 'Test',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
      });

      it('should handle empty title', () => {
        const options: ResultBuilderOptions = {
          violations: ['Error'],
          title: '',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.message).toContain('in ');
      });

      it('should handle empty type', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test',
          type: '',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.message).toContain('verified');
      });

      it('should include config in result', () => {
        const options: ResultBuilderOptions = {
          violations: [],
          title: 'Test',
          type: 'Code',
          config: mockConfig,
        };

        const result = ResultBuilder.create(options);

        expect(result.config).toBe(mockConfig);
      });
    });
  });

  describe('ResultBuilder.createError', () => {
    it('should create error result from Error object', () => {
      const error = new Error('File not found');

      const result = ResultBuilder.createError('Config', error, mockConfig);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Error checking Config');
      expect(result.message).toContain('File not found');
      expect(result.score).toBe(0);
    });

    it('should create error result from string', () => {
      const result = ResultBuilder.createError(
        'Test',
        'Something went wrong',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Something went wrong');
      expect(result.violations).toContain('Something went wrong');
    });

    it('should not be fixable', () => {
      const result = ResultBuilder.createError('Test', 'Error', mockConfig);

      expect(result.fixable).toBe(false);
    });

    it('should have empty suggestions', () => {
      const result = ResultBuilder.createError('Test', 'Error', mockConfig);

      expect(result.suggestions).toEqual([]);
    });

    it('should include error in details', () => {
      const result = ResultBuilder.createError(
        'Test',
        'Critical failure',
        mockConfig
      );

      expect(result.details).toContain('Critical failure');
    });

    it('should include error in violations', () => {
      const result = ResultBuilder.createError(
        'Test',
        'Parse error',
        mockConfig
      );

      expect(result.violations).toContain('Parse error');
    });

    it('should handle Error with complex message', () => {
      const error = new Error('Line 42: Unexpected token\n  at parse()');

      const result = ResultBuilder.createError('Parser', error, mockConfig);

      expect(result.message).toContain('Line 42');
    });

    it('should include config in result', () => {
      const result = ResultBuilder.createError('Test', 'Error', mockConfig);

      expect(result.config).toBe(mockConfig);
    });

    it('should format message correctly with title', () => {
      const result = ResultBuilder.createError(
        'AngularChecker',
        'Component error',
        mockConfig
      );

      expect(result.message).toBe(
        '❌ Error checking AngularChecker: Component error'
      );
    });
  });

  describe('ResultBuilderOptions interface', () => {
    it('should accept minimal options', () => {
      const options: ResultBuilderOptions = {
        violations: [],
        title: 'Test',
        type: 'Code',
        config: mockConfig,
      };

      expect(() => ResultBuilder.create(options)).not.toThrow();
    });

    it('should accept all optional fields', () => {
      const options: ResultBuilderOptions = {
        violations: ['error'],
        title: 'Test',
        type: 'Code',
        suggestions: ['fix'],
        config: mockConfig,
        lawName: 'law-test',
        metrics: { count: 1 },
      };

      const result = ResultBuilder.create(options);

      expect(result.lawName).toBe('law-test');
      expect(result.metrics).toEqual({ count: 1 });
      expect(result.suggestions).toContain('fix');
    });
  });
});
