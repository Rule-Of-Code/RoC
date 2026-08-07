/**
 * Tests for CoreWebVitalsComplianceLaw
 *
 * Tests the main law that orchestrates all Core Web Vitals checks.
 */
import { CoreWebVitalsComplianceLaw } from '../../../src/laws/performance/core-web-vitals-compliance';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../../../src/laws/performance/core-web-vitals-compliance/constants/performance-checks';
import { CoreWebVitalsAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/analyzer.service';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';

describe('CoreWebVitalsComplianceLaw', () => {
  const mockConfig: RuleOfCodeConfig = {
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
  };

  const createContext = (): LawCheckContext => ({
    projectRoot: '/test/project',
    config: mockConfig,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('check', () => {
    it('should return passed true with full score when all checks pass', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe(
        'Core Web Vitals compliance properly configured'
      );
    });

    it('should add violation when lighthouse config is missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: false, configFiles: [] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.LIGHTHOUSE_NOT_CONFIGURED
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.LIGHTHOUSE_NOT_FOUND
      );
      expect(result.suggestions).toContain(
        Checks.SUGGESTION_MESSAGES.LIGHTHOUSE
      );
    });

    it('should add violation when performance budgets are missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: false, budgetFiles: [] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.PERFORMANCE_BUDGETS_MISSING
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.BUDGETS_NOT_CONFIGURED
      );
      expect(result.suggestions).toContain(Checks.SUGGESTION_MESSAGES.BUDGETS);
    });

    it('should add violation when bundle optimization is missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: { isOptimized: false, optimizations: [] },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.BUNDLE_NOT_OPTIMIZED
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.BUNDLE_NOT_OPTIMIZED
      );
      expect(result.suggestions).toContain(
        Checks.SUGGESTION_MESSAGES.BUNDLE_OPTIMIZATION
      );
    });

    it('should add violation when browser caching is missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: false, strategies: [] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.CACHING_STRATEGY_MISSING
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.CACHING_NOT_IMPLEMENTED
      );
      expect(result.suggestions).toContain(Checks.SUGGESTION_MESSAGES.CACHING);
    });

    it('should add violation when image optimization is missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: { isOptimized: false, optimizations: [] },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.IMAGE_NOT_OPTIMIZED
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.IMAGES_NOT_OPTIMIZED
      );
      expect(result.suggestions).toContain(
        Checks.SUGGESTION_MESSAGES.IMAGE_OPTIMIZATION
      );
    });

    it('should add violation when resource hints are missing', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: false, hints: [] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(
        100 - Checks.SCORE_DEDUCTIONS.RESOURCE_HINTS_MISSING
      );
      expect(result.violations).toContain(
        Checks.VIOLATION_MESSAGES.HINTS_NOT_CONFIGURED
      );
      expect(result.suggestions).toContain(
        Checks.SUGGESTION_MESSAGES.RESOURCE_HINTS
      );
    });

    it('should accumulate all violations and deductions when all checks fail', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: false, configFiles: [] },
        performanceBudgets: { hasBudgets: false, budgetFiles: [] },
        bundleOptimization: { isOptimized: false, optimizations: [] },
        browserCaching: { hasStrategy: false, strategies: [] },
        imageOptimization: { isOptimized: false, optimizations: [] },
        resourceHints: { hasHints: false, hints: [] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(6);
      expect(result.suggestions).toHaveLength(6);

      const expectedScore =
        100 -
        Checks.SCORE_DEDUCTIONS.LIGHTHOUSE_NOT_CONFIGURED -
        Checks.SCORE_DEDUCTIONS.PERFORMANCE_BUDGETS_MISSING -
        Checks.SCORE_DEDUCTIONS.BUNDLE_NOT_OPTIMIZED -
        Checks.SCORE_DEDUCTIONS.CACHING_STRATEGY_MISSING -
        Checks.SCORE_DEDUCTIONS.IMAGE_NOT_OPTIMIZED -
        Checks.SCORE_DEDUCTIONS.RESOURCE_HINTS_MISSING;

      expect(result.score).toBe(Math.max(0, expectedScore));
    });

    it('should ensure score does not go below 0', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: false, configFiles: [] },
        performanceBudgets: { hasBudgets: false, budgetFiles: [] },
        bundleOptimization: { isOptimized: false, optimizations: [] },
        browserCaching: { hasStrategy: false, strategies: [] },
        imageOptimization: { isOptimized: false, optimizations: [] },
        resourceHints: { hasHints: false, hints: [] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should include details array with violations and suggestions', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: false, configFiles: [] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.details).toContain(
        Checks.VIOLATION_MESSAGES.LIGHTHOUSE_NOT_FOUND
      );
      expect(result.details).toContain(Checks.SUGGESTION_MESSAGES.LIGHTHOUSE);
    });

    it('should set fixable to true', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.fixable).toBe(true);
    });

    it('should include config in result', async () => {
      jest.spyOn(CoreWebVitalsAnalyzerService, 'analyze').mockReturnValue({
        lighthouse: { hasConfig: true, configFiles: ['lighthouse.config.js'] },
        performanceBudgets: { hasBudgets: true, budgetFiles: ['angular.json'] },
        bundleOptimization: {
          isOptimized: true,
          optimizations: ['Lazy loading'],
        },
        browserCaching: { hasStrategy: true, strategies: ['Service Worker'] },
        imageOptimization: {
          isOptimized: true,
          optimizations: ['WebP images'],
        },
        resourceHints: { hasHints: true, hints: ['Preload hints'] },
      });

      const context = createContext();
      const result = await CoreWebVitalsComplianceLaw.check(context);

      expect(result.config).toBe(mockConfig);
    });

    it('should pass projectRoot and config to analyzer service', async () => {
      const analyzeSpy = jest
        .spyOn(CoreWebVitalsAnalyzerService, 'analyze')
        .mockReturnValue({
          lighthouse: { hasConfig: true, configFiles: [] },
          performanceBudgets: { hasBudgets: true, budgetFiles: [] },
          bundleOptimization: { isOptimized: true, optimizations: [] },
          browserCaching: { hasStrategy: true, strategies: [] },
          imageOptimization: { isOptimized: true, optimizations: [] },
          resourceHints: { hasHints: true, hints: [] },
        });

      const context = createContext();
      await CoreWebVitalsComplianceLaw.check(context);

      expect(analyzeSpy).toHaveBeenCalledWith('/test/project', mockConfig);
    });
  });
});
