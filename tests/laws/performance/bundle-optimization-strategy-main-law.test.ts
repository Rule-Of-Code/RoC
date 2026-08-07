/**
 * Tests for BundleOptimizationStrategyLaw (main law file)
 *
 * Tests for bundle optimization strategy coordination and result building.
 */
import { BundleOptimizationStrategyLaw } from '../../../src/laws/performance/bundle-optimization-strategy';
import { BundleOptimizationStrategyAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/analyzer.service';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';

describe('BundleOptimizationStrategyLaw - Main Law', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('bundle-opt-strategy-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          componentPrefix: 'app',
          type: 'angular',
        },
        ignores: {
          global: ['node_modules/**', 'dist/**'],
          tests: ['**/*.spec.ts'],
          build: ['dist/**'],
          design: [],
        },
        laws: {
          paretoMode: false,
          severity: {},
        },
        hooks: {
          preCommit: false,
          prePush: false,
          commitMsg: false,
        },
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: true,
        },
        performance: {
          parallel: true,
          maxConcurrent: 4,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('check method', () => {
    it('should return LawResult with expected structure', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('runAllAnalyses', () => {
    it('should pass when all analyses pass', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: true,
          strategies: ['Route-based code splitting with lazy loading'],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: true,
          configurations: ['Angular build optimization enabled'],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: true,
          configurations: ['Minification configured'],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: true,
          strategies: ['Critical CSS tools available'],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: true,
          optimizations: ['Vendor chunk splitting configured'],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: true,
          tools: ['webpack-bundle-analyzer'],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe(
        'Bundle optimization strategy properly implemented'
      );
    });

    it('should fail with violations when code splitting is not configured', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: true,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: true,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: true,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Code splitting not configured');
      expect(result.score).toBeLessThan(100);
    });

    it('should accumulate multiple violations when multiple analyses fail', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: false,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: false,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: false,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: false,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBeGreaterThanOrEqual(6);
      expect(result.suggestions!.length).toBeGreaterThanOrEqual(6);
      // Total penalties: 20+15+15+12+10+18 = 90, so minimum score is 10
      expect(result.score).toBe(10);
    });

    it('should calculate correct score based on penalties', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: true,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: true,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: true,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      // Code splitting penalty is 20
      expect(result.score).toBe(80);
    });
  });

  describe('buildResult', () => {
    it('should return passed true when no violations', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: true,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: true,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: true,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: true,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.message).toBe(
        'Bundle optimization strategy properly implemented'
      );
    });

    it('should join violations in message when there are violations', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: false,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: true,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: true,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: true,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: true,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      expect(result.message).toContain('Bundle optimization issues found');
      expect(result.message).toContain('Code splitting not configured');
      expect(result.message).toContain('Tree shaking not enabled');
    });

    it('should cap score at 0 when penalties exceed 100', () => {
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeCodeSplitting'
        )
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeTreeShaking')
        .mockReturnValue({
          isEnabled: false,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeMinification')
        .mockReturnValue({
          isOptimal: false,
          configurations: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeCriticalCSS')
        .mockReturnValue({
          isConfigured: false,
          strategies: [],
        });
      jest
        .spyOn(BundleOptimizationStrategyAnalyzerService, 'analyzeVendorChunk')
        .mockReturnValue({
          isOptimized: false,
          optimizations: [],
        });
      jest
        .spyOn(
          BundleOptimizationStrategyAnalyzerService,
          'analyzeBundleAnalysis'
        )
        .mockReturnValue({
          isSetup: false,
          tools: [],
        });

      const result = BundleOptimizationStrategyLaw.check(mockContext);

      // Total penalties: 20+15+15+12+10+18 = 90, so minimum score is 10
      expect(result.score).toBe(10);
    });

    it('should include details array', () => {
      const result = BundleOptimizationStrategyLaw.check(mockContext);
      expect(Array.isArray(result.details)).toBe(true);
    });
  });
});
