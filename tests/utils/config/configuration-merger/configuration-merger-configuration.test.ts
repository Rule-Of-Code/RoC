/**
 * Configuration Merger Configuration - Tests
 * Tests for ConfigurationMergerConfiguration class
 */
import { ConfigurationMergerConfiguration } from '../../../../src/utils/config/configuration-merger/configuration-merger-configuration';

describe('ConfigurationMergerConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('DEFAULT_IGNORE_PATTERNS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
          )
        ).toBe(true);
      });

      it('should include node_modules', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/node_modules/**');
      });

      it('should include dist', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/dist/**');
      });

      it('should include build', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/build/**');
      });

      it('should include coverage', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/coverage/**');
      });

      it('should include .git', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/.git/**');
      });

      it('should include .nx', () => {
        expect(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS
        ).toContain('**/.nx/**');
      });
    });

    describe('OPTIMIZED_IGNORE_PATTERNS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(
            ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS
          )
        ).toBe(true);
      });

      it('should be shorter than default patterns', () => {
        expect(
          ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS.length
        ).toBeLessThanOrEqual(
          ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS.length
        );
      });

      it('should include essential patterns', () => {
        expect(
          ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS
        ).toContain('**/node_modules/**');
        expect(
          ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS
        ).toContain('**/dist/**');
        expect(
          ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS
        ).toContain('**/.git/**');
      });
    });

    describe('HIGH_VALUE_LAWS', () => {
      it('should be an array', () => {
        expect(
          Array.isArray(ConfigurationMergerConfiguration.HIGH_VALUE_LAWS)
        ).toBe(true);
      });

      it('should have multiple laws', () => {
        expect(
          ConfigurationMergerConfiguration.HIGH_VALUE_LAWS.length
        ).toBeGreaterThan(0);
      });

      it('should include typescript-strict-mode', () => {
        expect(ConfigurationMergerConfiguration.HIGH_VALUE_LAWS).toContain(
          'typescript-strict-mode'
        );
      });

      it('should include no-console-statements', () => {
        expect(ConfigurationMergerConfiguration.HIGH_VALUE_LAWS).toContain(
          'no-console-statements'
        );
      });

      it('should include test-coverage-constitutional-standard', () => {
        expect(ConfigurationMergerConfiguration.HIGH_VALUE_LAWS).toContain(
          'test-coverage-constitutional-standard'
        );
      });
    });

    describe('PARETO_DESCRIPTION', () => {
      it('should be a string', () => {
        expect(typeof ConfigurationMergerConfiguration.PARETO_DESCRIPTION).toBe(
          'string'
        );
      });

      it('should mention 20% and 80%', () => {
        expect(ConfigurationMergerConfiguration.PARETO_DESCRIPTION).toContain(
          '20%'
        );
        expect(ConfigurationMergerConfiguration.PARETO_DESCRIPTION).toContain(
          '80%'
        );
      });
    });

    describe('MERGE_VALIDATION_RULES', () => {
      it('should have validateRequiredFields', () => {
        expect(
          ConfigurationMergerConfiguration.MERGE_VALIDATION_RULES
            .validateRequiredFields
        ).toBe(true);
      });

      it('should have applyDefaults', () => {
        expect(
          ConfigurationMergerConfiguration.MERGE_VALIDATION_RULES.applyDefaults
        ).toBe(true);
      });

      it('should have optimizePerformance', () => {
        expect(
          ConfigurationMergerConfiguration.MERGE_VALIDATION_RULES
            .optimizePerformance
        ).toBe(true);
      });
    });

    describe('DEEP_MERGE_CONFIG', () => {
      it('should have preserveArrays', () => {
        expect(
          ConfigurationMergerConfiguration.DEEP_MERGE_CONFIG.preserveArrays
        ).toBe(true);
      });

      it('should have mergeObjects', () => {
        expect(
          ConfigurationMergerConfiguration.DEEP_MERGE_CONFIG.mergeObjects
        ).toBe(true);
      });

      it('should have skipNullValues', () => {
        expect(
          ConfigurationMergerConfiguration.DEEP_MERGE_CONFIG.skipNullValues
        ).toBe(true);
      });
    });
  });

  // ============================================
  // Utility Methods
  // ============================================
  describe('Utility Methods', () => {
    describe('shouldDeepMerge()', () => {
      it('should return true for plain objects', () => {
        expect(ConfigurationMergerConfiguration.shouldDeepMerge({})).toBe(true);
        expect(
          ConfigurationMergerConfiguration.shouldDeepMerge({ key: 'value' })
        ).toBe(true);
      });

      it('should return false for arrays', () => {
        expect(ConfigurationMergerConfiguration.shouldDeepMerge([])).toBe(
          false
        );
        expect(
          ConfigurationMergerConfiguration.shouldDeepMerge([1, 2, 3])
        ).toBe(false);
      });

      it('should return false for null', () => {
        expect(ConfigurationMergerConfiguration.shouldDeepMerge(null)).toBe(
          false
        );
      });

      it('should return false for undefined', () => {
        expect(
          ConfigurationMergerConfiguration.shouldDeepMerge(undefined)
        ).toBe(false);
      });

      it('should return false for primitives', () => {
        expect(ConfigurationMergerConfiguration.shouldDeepMerge('string')).toBe(
          false
        );
        expect(ConfigurationMergerConfiguration.shouldDeepMerge(123)).toBe(
          false
        );
        expect(ConfigurationMergerConfiguration.shouldDeepMerge(true)).toBe(
          false
        );
      });

      it('should return true for nested objects', () => {
        expect(
          ConfigurationMergerConfiguration.shouldDeepMerge({
            nested: { deep: true },
          })
        ).toBe(true);
      });
    });

    describe('shouldApplyDefaultIgnore()', () => {
      const baseConfig = {
        project: {
          name: 'test',
          root: '',
          componentPrefix: 'app',
          type: 'generic' as const,
        },
        ignores: { global: [], tests: [], build: [], design: [] },
        laws: { paretoMode: false, severity: {} },
        hooks: { preCommit: false, prePush: false, commitMsg: false },
        includes: { global: [] },
        excludes: {},
        reporting: {
          format: 'console' as const,
          verbose: false,
          onlyFailures: false,
          scoring: false,
        },
        performance: {
          parallel: false,
          maxConcurrent: 3,
          cache: true,
        },
      };

      it('should return true for pattern not in config', () => {
        const result =
          ConfigurationMergerConfiguration.shouldApplyDefaultIgnore(
            baseConfig,
            '**/*.custom/**'
          );
        expect(result).toBe(true);
      });

      it('should return false for pattern already in config', () => {
        const config = {
          ...baseConfig,
          ignores: { ...baseConfig.ignores, global: ['**/dist/**'] },
        };
        const result =
          ConfigurationMergerConfiguration.shouldApplyDefaultIgnore(
            config,
            '**/dist/**'
          );
        expect(result).toBe(false);
      });

      it('should return false for default ignore patterns', () => {
        const result =
          ConfigurationMergerConfiguration.shouldApplyDefaultIgnore(
            baseConfig,
            '**/node_modules/**'
          );
        expect(result).toBe(false);
      });
    });

    describe('shouldEnableLawByDefault()', () => {
      it('should return true for high value laws', () => {
        expect(
          ConfigurationMergerConfiguration.shouldEnableLawByDefault(
            'typescript-strict-mode'
          )
        ).toBe(true);
        expect(
          ConfigurationMergerConfiguration.shouldEnableLawByDefault(
            'no-console-statements'
          )
        ).toBe(true);
      });

      it('should return false for non-high value laws', () => {
        expect(
          ConfigurationMergerConfiguration.shouldEnableLawByDefault(
            'random-law-name'
          )
        ).toBe(false);
        expect(
          ConfigurationMergerConfiguration.shouldEnableLawByDefault(
            'custom-law'
          )
        ).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(
          ConfigurationMergerConfiguration.shouldEnableLawByDefault('')
        ).toBe(false);
      });
    });
  });
});
