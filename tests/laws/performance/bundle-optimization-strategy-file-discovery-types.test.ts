/**
 * Tests for Bundle Optimization Strategy File Discovery and Types Constants
 *
 * Tests the file discovery and types configuration for bundle optimization.
 */
import { BundleOptimizationStrategyFileDiscoveryConstants } from '../../../src/laws/performance/bundle-optimization-strategy/constants/file-discovery';
import {
  AngularJson,
  BuildOptions,
  BundleOptimizationStrategyTypesConstants,
  JsonReadResult,
  OptimizationConfig,
  PackageJsonFile,
} from '../../../src/laws/performance/bundle-optimization-strategy/constants/types';

describe('BundleOptimizationStrategyFileDiscoveryConstants', () => {
  describe('Directory constants', () => {
    it('should have SOURCE_DIRECTORY as src', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.SOURCE_DIRECTORY
      ).toBe('src');
    });

    it('should have SCAN_DIRECTORIES array', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('src');
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('apps');
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('libs');
    });
  });

  describe('CONFIG_FILE_PATTERNS', () => {
    it('should have ANGULAR_JSON pattern', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .ANGULAR_JSON
      ).toBeDefined();
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS.ANGULAR_JSON.test(
          'angular.json'
        )
      ).toBe(true);
    });

    it('should have WEBPACK_CONFIG pattern', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS.WEBPACK_CONFIG.test(
          'webpack.config.js'
        )
      ).toBe(true);
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS.WEBPACK_CONFIG.test(
          'webpack.config.ts'
        )
      ).toBe(true);
    });

    it('should have NGINX_CONFIG pattern', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS.NGINX_CONFIG.test(
          'nginx.conf'
        )
      ).toBe(true);
    });

    it('should have PACKAGE_JSON pattern', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.CONFIG_FILE_PATTERNS.PACKAGE_JSON.test(
          'package.json'
        )
      ).toBe(true);
    });
  });

  describe('ROUTING_FILE_PATTERN', () => {
    it('should be routing', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.ROUTING_FILE_PATTERN
      ).toBe('routing');
    });
  });

  describe('isConfigFile', () => {
    it('should return true for angular.json', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.isConfigFile(
          'angular.json'
        )
      ).toBe(true);
    });

    it('should return true for webpack.config.js', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.isConfigFile(
          'webpack.config.js'
        )
      ).toBe(true);
    });

    it('should return true for package.json', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.isConfigFile(
          'package.json'
        )
      ).toBe(true);
    });

    it('should return false for regular file', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.isConfigFile('app.ts')
      ).toBe(false);
    });
  });

  describe('getConfigFileType', () => {
    it('should return ANGULAR_JSON for angular.json', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.getConfigFileType(
          'angular.json'
        )
      ).toBe('ANGULAR_JSON');
    });

    it('should return WEBPACK_CONFIG for webpack.config.js', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.getConfigFileType(
          'webpack.config.js'
        )
      ).toBe('WEBPACK_CONFIG');
    });

    it('should return PACKAGE_JSON for package.json', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.getConfigFileType(
          'package.json'
        )
      ).toBe('PACKAGE_JSON');
    });

    it('should return UNKNOWN for unrecognized file', () => {
      expect(
        BundleOptimizationStrategyFileDiscoveryConstants.getConfigFileType(
          'app.ts'
        )
      ).toBe('UNKNOWN');
    });
  });
});

describe('BundleOptimizationStrategyTypesConstants', () => {
  describe('VIOLATION_MESSAGES', () => {
    it('should have CODE_SPLITTING_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .CODE_SPLITTING_NOT_CONFIGURED
      ).toContain('Code splitting');
    });

    it('should have TREE_SHAKING_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .TREE_SHAKING_NOT_CONFIGURED
      ).toContain('Tree shaking');
    });

    it('should have MINIFICATION_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .MINIFICATION_NOT_CONFIGURED
      ).toContain('Minification');
    });

    it('should have CRITICAL_CSS_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .CRITICAL_CSS_NOT_CONFIGURED
      ).toContain('Critical CSS');
    });

    it('should have VENDOR_CHUNK_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .VENDOR_CHUNK_NOT_CONFIGURED
      ).toContain('Vendor chunk');
    });

    it('should have BUNDLE_ANALYSIS_NOT_CONFIGURED', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES
          .BUNDLE_ANALYSIS_NOT_CONFIGURED
      ).toContain('Bundle analysis');
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    it('should have CODE_SPLITTING_SUGGESTION', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SUGGESTION_MESSAGES
          .CODE_SPLITTING_SUGGESTION
      ).toContain('code splitting');
    });

    it('should have TREE_SHAKING_SUGGESTION', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SUGGESTION_MESSAGES
          .TREE_SHAKING_SUGGESTION
      ).toContain('tree shaking');
    });

    it('should have MINIFICATION_SUGGESTION', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SUGGESTION_MESSAGES
          .MINIFICATION_SUGGESTION
      ).toContain('minification');
    });

    it('should have BUNDLE_ANALYSIS_SUGGESTION', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SUGGESTION_MESSAGES
          .BUNDLE_ANALYSIS_SUGGESTION
      ).toContain('bundle analysis');
    });
  });

  describe('SCORE_PENALTIES', () => {
    it('should have CODE_SPLITTING penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.CODE_SPLITTING
      ).toBe(20);
    });

    it('should have TREE_SHAKING penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.TREE_SHAKING
      ).toBe(15);
    });

    it('should have MINIFICATION penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.MINIFICATION
      ).toBe(15);
    });

    it('should have CRITICAL_CSS penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.CRITICAL_CSS
      ).toBe(12);
    });

    it('should have VENDOR_CHUNK penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.VENDOR_CHUNK
      ).toBe(10);
    });

    it('should have BUNDLE_ANALYSIS penalty', () => {
      expect(
        BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES.BUNDLE_ANALYSIS
      ).toBe(18);
    });
  });
});

describe('Bundle Optimization Types', () => {
  describe('BuildOptions interface', () => {
    it('should accept boolean optimization', () => {
      const options: BuildOptions = { optimization: true };
      expect(options.optimization).toBe(true);
    });

    it('should accept OptimizationConfig', () => {
      const config: OptimizationConfig = { scripts: true, styles: true };
      const options: BuildOptions = { optimization: config };
      expect(options.optimization).toEqual(config);
    });
  });

  describe('AngularJson interface', () => {
    it('should accept valid angular.json structure', () => {
      const angularJson: AngularJson = {
        projects: {
          'my-app': {
            architect: {
              build: {
                options: { optimization: true },
              },
            },
          },
        },
      };
      expect(angularJson.projects).toBeDefined();
    });
  });

  describe('PackageJsonFile interface', () => {
    it('should accept valid package.json structure', () => {
      const packageJson: PackageJsonFile = {
        type: 'module',
        dependencies: { rxjs: '^7.0.0' },
        scripts: { build: 'ng build' },
      };
      expect(packageJson.type).toBe('module');
    });
  });

  describe('JsonReadResult interface', () => {
    it('should accept success result', () => {
      const result: JsonReadResult<{ name: string }> = {
        data: { name: 'test' },
        success: true,
      };
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('test');
    });

    it('should accept failure result', () => {
      const result: JsonReadResult<{ name: string }> = {
        data: null,
        success: false,
      };
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
  });
});
