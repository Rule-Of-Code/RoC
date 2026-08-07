/**
 * @fileoverview Tests for bundle-size-testing-configuration.ts
 * @description Tests for bundle size testing configuration constants
 */

import { BundleSizeTestingConfiguration } from '../../src/utils/testing/bundle-size-analyzer/bundle-size-testing-configuration';

describe('utils/testing/bundle-size-analyzer/bundle-size-testing-configuration', () => {
  describe('BUNDLE_ANALYSIS_TOOLS', () => {
    const tools = BundleSizeTestingConfiguration.BUNDLE_ANALYSIS_TOOLS;

    it('should contain webpack-bundle-analyzer', () => {
      expect(tools).toContain('webpack-bundle-analyzer');
    });

    it('should contain bundle-analyzer', () => {
      expect(tools).toContain('bundle-analyzer');
    });

    it('should contain size-limit', () => {
      expect(tools).toContain('size-limit');
    });

    it('should contain bundlesize', () => {
      expect(tools).toContain('bundlesize');
    });

    it('should contain bundlewatch', () => {
      expect(tools).toContain('bundlewatch');
    });

    it('should contain @next/bundle-analyzer', () => {
      expect(tools).toContain('@next/bundle-analyzer');
    });

    it('should contain rollup-plugin-analyzer', () => {
      expect(tools).toContain('rollup-plugin-analyzer');
    });

    it('should contain vite-bundle-analyzer', () => {
      expect(tools).toContain('vite-bundle-analyzer');
    });

    it('should have 8 bundle analysis tools', () => {
      expect(tools).toHaveLength(8);
    });
  });

  describe('BUNDLE_CONFIG_PATTERNS', () => {
    const patterns = BundleSizeTestingConfiguration.BUNDLE_CONFIG_PATTERNS;

    it('should contain .bundlewatch.config.js', () => {
      expect(patterns).toContain('.bundlewatch.config.js');
    });

    it('should contain .bundlesizerc', () => {
      expect(patterns).toContain('.bundlesizerc');
    });

    it('should contain .bundlesize.json', () => {
      expect(patterns).toContain('.bundlesize.json');
    });

    it('should contain size-limit.config.js', () => {
      expect(patterns).toContain('size-limit.config.js');
    });

    it('should contain bundle-analyzer.config.js', () => {
      expect(patterns).toContain('bundle-analyzer.config.js');
    });

    it('should have 5 config patterns', () => {
      expect(patterns).toHaveLength(5);
    });
  });

  describe('TEST_DIRECTORIES', () => {
    const directories = BundleSizeTestingConfiguration.TEST_DIRECTORIES;

    it('should contain src', () => {
      expect(directories).toContain('src');
    });

    it('should contain tests', () => {
      expect(directories).toContain('tests');
    });

    it('should contain test', () => {
      expect(directories).toContain('test');
    });

    it('should contain __tests__', () => {
      expect(directories).toContain('__tests__');
    });

    it('should have 4 test directories', () => {
      expect(directories).toHaveLength(4);
    });
  });

  describe('BUNDLE_REPORTS', () => {
    const reports = BundleSizeTestingConfiguration.BUNDLE_REPORTS;

    it('should contain bundle-report.html', () => {
      expect(reports).toContain('bundle-report.html');
    });

    it('should contain stats.json', () => {
      expect(reports).toContain('stats.json');
    });

    it('should contain webpack-bundle-analyzer.html', () => {
      expect(reports).toContain('webpack-bundle-analyzer.html');
    });

    it('should have 3 bundle reports', () => {
      expect(reports).toHaveLength(3);
    });
  });

  describe('BUNDLE_TEST_PATTERNS', () => {
    const patterns = BundleSizeTestingConfiguration.BUNDLE_TEST_PATTERNS;

    it('should have 4 test patterns', () => {
      expect(patterns).toHaveLength(4);
    });

    it('should be array of RegExp', () => {
      patterns.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('should match bundle size test files', () => {
      expect(patterns[0]?.test('bundle.size.test.ts')).toBe(true);
      expect(patterns[0]?.test('bundle-size.spec.js')).toBe(true);
    });

    it('should match size test files', () => {
      expect(patterns[1]?.test('size.test.js')).toBe(true);
      expect(patterns[1]?.test('size-test.ts')).toBe(true);
    });

    it('should match performance bundle test files', () => {
      expect(patterns[3]?.test('performance-bundle.test.ts')).toBe(true);
      expect(patterns[3]?.test('performance.bundle.spec.js')).toBe(true);
    });
  });

  describe('CI_CONFIG_FILES', () => {
    const files = BundleSizeTestingConfiguration.CI_CONFIG_FILES;

    it('should contain GitHub CI workflow', () => {
      expect(files).toContain('.github/workflows/ci.yml');
    });

    it('should contain GitHub build workflow', () => {
      expect(files).toContain('.github/workflows/build.yml');
    });

    it('should contain GitHub performance workflow', () => {
      expect(files).toContain('.github/workflows/performance.yml');
    });

    it('should contain GitLab CI config', () => {
      expect(files).toContain('.gitlab-ci.yml');
    });

    it('should contain Bitbucket pipelines', () => {
      expect(files).toContain('bitbucket-pipelines.yml');
    });

    it('should contain Azure pipelines', () => {
      expect(files).toContain('azure-pipelines.yml');
    });

    it('should have 6 CI config files', () => {
      expect(files).toHaveLength(6);
    });
  });

  describe('PERFORMANCE_KEYWORDS', () => {
    const keywords = BundleSizeTestingConfiguration.PERFORMANCE_KEYWORDS;

    it('should have BUNDLE_SIZE keywords', () => {
      expect(keywords.BUNDLE_SIZE).toContain('bundle');
      expect(keywords.BUNDLE_SIZE).toContain('size');
      expect(keywords.BUNDLE_SIZE).toHaveLength(2);
    });

    it('should have LIGHTHOUSE keywords', () => {
      expect(keywords.LIGHTHOUSE).toContain('lighthouse');
      expect(keywords.LIGHTHOUSE).toContain('performance');
      expect(keywords.LIGHTHOUSE).toHaveLength(2);
    });

    it('should have BUNDLE_ENFORCEMENT keywords', () => {
      expect(keywords.BUNDLE_ENFORCEMENT).toContain('bundlesize');
      expect(keywords.BUNDLE_ENFORCEMENT).toContain('bundlewatch');
      expect(keywords.BUNDLE_ENFORCEMENT).toHaveLength(2);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    const messages = BundleSizeTestingConfiguration.VALIDATION_MESSAGES;

    it('should have NO_BUNDLE_TOOLS message', () => {
      expect(messages.NO_BUNDLE_TOOLS).toBe(
        'No bundle analysis tools found in package.json'
      );
    });

    it('should have NO_CONFIG_FILES message', () => {
      expect(messages.NO_CONFIG_FILES).toBe(
        'No bundle size configuration files found'
      );
    });

    it('should have NO_TEST_FILES message', () => {
      expect(messages.NO_TEST_FILES).toBe('No bundle size test files found');
    });

    it('should have NO_CI_METRICS message', () => {
      expect(messages.NO_CI_METRICS).toBe(
        'No bundle size metrics tracking in CI configuration'
      );
    });

    it('should have MISSING_BUNDLE_TESTING message', () => {
      expect(messages.MISSING_BUNDLE_TESTING).toBe(
        'Bundle size testing implementation not found'
      );
    });

    it('should have NO_OPTIMIZATION_CONFIG message', () => {
      expect(messages.NO_OPTIMIZATION_CONFIG).toBe(
        'No bundle optimization configuration found'
      );
    });

    it('should have NO_OPTIMIZATION_CONFIG_SUGGESTION message', () => {
      expect(messages.NO_OPTIMIZATION_CONFIG_SUGGESTION).toBe(
        'Configure bundle optimization in angular.json or webpack.config.js'
      );
    });

    it('should have HEAVY_LIBS_NO_LAZY_LOADING message template', () => {
      expect(messages.HEAVY_LIBS_NO_LAZY_LOADING).toContain('{libs}');
    });

    it('should have HEAVY_LIBS_SUGGESTION message', () => {
      expect(messages.HEAVY_LIBS_SUGGESTION).toContain('lazy loading');
    });

    it('should have NO_BUNDLE_REPORTS message', () => {
      expect(messages.NO_BUNDLE_REPORTS).toBe(
        'No bundle analysis reports found'
      );
    });

    it('should have NO_BUNDLE_REPORTS_SUGGESTION message', () => {
      expect(messages.NO_BUNDLE_REPORTS_SUGGESTION).toContain(
        'webpack-bundle-analyzer'
      );
    });
  });

  describe('FILE_EXTENSIONS', () => {
    const extensions = BundleSizeTestingConfiguration.FILE_EXTENSIONS;

    it('should have CONFIG extensions', () => {
      expect(extensions.CONFIG).toContain('.js');
      expect(extensions.CONFIG).toContain('.json');
      expect(extensions.CONFIG).toHaveLength(2);
    });

    it('should have TEST extensions', () => {
      expect(extensions.TEST).toContain('.ts');
      expect(extensions.TEST).toContain('.js');
      expect(extensions.TEST).toHaveLength(2);
    });

    it('should have CI extensions', () => {
      expect(extensions.CI).toContain('.yml');
      expect(extensions.CI).toContain('.yaml');
      expect(extensions.CI).toHaveLength(2);
    });
  });

  describe('PERFORMANCE_METRICS_TYPES', () => {
    const types = BundleSizeTestingConfiguration.PERFORMANCE_METRICS_TYPES;

    it('should contain bundle size tracking', () => {
      expect(types).toContain('Bundle size tracking in CI');
    });

    it('should contain performance monitoring', () => {
      expect(types).toContain('Performance monitoring in CI');
    });

    it('should contain bundle size enforcement', () => {
      expect(types).toContain('Bundle size enforcement in CI');
    });

    it('should have 3 metrics types', () => {
      expect(types).toHaveLength(3);
    });
  });

  describe('OPTIMIZATION_KEYWORDS', () => {
    const keywords = BundleSizeTestingConfiguration.OPTIMIZATION_KEYWORDS;

    it('should contain optimization', () => {
      expect(keywords).toContain('optimization');
    });

    it('should contain minimize', () => {
      expect(keywords).toContain('minimize');
    });

    it('should contain treeshake', () => {
      expect(keywords).toContain('treeshake');
    });

    it('should contain splitChunks', () => {
      expect(keywords).toContain('splitChunks');
    });

    it('should contain bundleAnalyzer', () => {
      expect(keywords).toContain('bundleAnalyzer');
    });

    it('should have 5 optimization keywords', () => {
      expect(keywords).toHaveLength(5);
    });
  });

  describe('Additional constants', () => {
    it('should have LAZY_LOADING_KEYWORD as loadChildren', () => {
      expect(BundleSizeTestingConfiguration.LAZY_LOADING_KEYWORD).toBe(
        'loadChildren'
      );
    });

    it('should have ROUTING_FILE_PATTERN as routing', () => {
      expect(BundleSizeTestingConfiguration.ROUTING_FILE_PATTERN).toBe(
        'routing'
      );
    });
  });
});
