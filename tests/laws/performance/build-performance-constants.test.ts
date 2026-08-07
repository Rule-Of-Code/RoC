/**
 * Tests for BuildPerformanceConstants
 *
 * Tests build monitoring tools and script patterns.
 */
import { BuildPerformanceConstants } from '../../../src/laws/performance/performance-monitoring/constants/build-performance.constants';

describe('BuildPerformanceConstants', () => {
  describe('BUILD_MONITORING_TOOLS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(BuildPerformanceConstants.BUILD_MONITORING_TOOLS)
      ).toBe(true);
    });

    it('should contain speed-measure-webpack-plugin', () => {
      expect(BuildPerformanceConstants.BUILD_MONITORING_TOOLS).toContain(
        'speed-measure-webpack-plugin'
      );
    });

    it('should contain webpack-bundle-analyzer', () => {
      expect(BuildPerformanceConstants.BUILD_MONITORING_TOOLS).toContain(
        'webpack-bundle-analyzer'
      );
    });

    it('should contain @angular/build-tools', () => {
      expect(BuildPerformanceConstants.BUILD_MONITORING_TOOLS).toContain(
        '@angular/build-tools'
      );
    });

    it('should contain build-time-analyzer', () => {
      expect(BuildPerformanceConstants.BUILD_MONITORING_TOOLS).toContain(
        'build-time-analyzer'
      );
    });

    it('should have exactly 4 tools', () => {
      expect(BuildPerformanceConstants.BUILD_MONITORING_TOOLS.length).toBe(4);
    });
  });

  describe('BUILD_PERF_SCRIPT_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(BuildPerformanceConstants.BUILD_PERF_SCRIPT_PATTERNS)
      ).toBe(true);
    });

    it('should contain analyze pattern', () => {
      expect(BuildPerformanceConstants.BUILD_PERF_SCRIPT_PATTERNS).toContain(
        'analyze'
      );
    });

    it('should contain perf pattern', () => {
      expect(BuildPerformanceConstants.BUILD_PERF_SCRIPT_PATTERNS).toContain(
        'perf'
      );
    });

    it('should contain measure pattern', () => {
      expect(BuildPerformanceConstants.BUILD_PERF_SCRIPT_PATTERNS).toContain(
        'measure'
      );
    });

    it('should have exactly 3 patterns', () => {
      expect(BuildPerformanceConstants.BUILD_PERF_SCRIPT_PATTERNS.length).toBe(
        3
      );
    });
  });

  describe('isBuildMonitoringTool', () => {
    it('should return true for speed-measure-webpack-plugin', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool(
          'speed-measure-webpack-plugin'
        )
      ).toBe(true);
    });

    it('should return true for webpack-bundle-analyzer', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool(
          'webpack-bundle-analyzer'
        )
      ).toBe(true);
    });

    it('should return true for @angular/build-tools', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool('@angular/build-tools')
      ).toBe(true);
    });

    it('should return true for build-time-analyzer', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool('build-time-analyzer')
      ).toBe(true);
    });

    it('should return false for unknown package', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool('some-other-package')
      ).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(BuildPerformanceConstants.isBuildMonitoringTool('')).toBe(false);
    });

    it('should return false for partial match', () => {
      expect(
        BuildPerformanceConstants.isBuildMonitoringTool('webpack-bundle')
      ).toBe(false);
    });
  });

  describe('isBuildPerfScript', () => {
    it('should return true for analyze script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('analyze')).toBe(true);
    });

    it('should return true for bundle:analyze script', () => {
      expect(
        BuildPerformanceConstants.isBuildPerfScript('bundle:analyze')
      ).toBe(true);
    });

    it('should return true for perf script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('perf')).toBe(true);
    });

    it('should return true for run-perf-tests script', () => {
      expect(
        BuildPerformanceConstants.isBuildPerfScript('run-perf-tests')
      ).toBe(true);
    });

    it('should return true for measure script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('measure')).toBe(true);
    });

    it('should return true for measure-build script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('measure-build')).toBe(
        true
      );
    });

    it('should return false for build script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('build')).toBe(false);
    });

    it('should return false for test script', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('test')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(BuildPerformanceConstants.isBuildPerfScript('')).toBe(false);
    });
  });
});
