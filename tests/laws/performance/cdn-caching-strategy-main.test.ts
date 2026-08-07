/**
 * Tests for CdnCachingStrategyLaw (main law file)
 *
 * Tests for CDN and caching strategy analysis coordination and result building.
 */
import { CdnCachingStrategyLaw } from '../../../src/laws/performance/cdn-caching-strategy';
import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../../../src/laws/performance/cdn-caching-strategy/constants/caching-strategies';
import { CdnCachingStrategyAnalyzerService } from '../../../src/laws/performance/cdn-caching-strategy/services/analyzer.service';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CdnCachingStrategyLaw - Main', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('cdn-caching-strategy-test-');
    // Substrate for the law: a project that actually serves web assets. Without
    // sources the law short-circuits to N/A and never reaches the analyzer that
    // these tests mock.
    FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'app'));
    FileUtils.writeFile(
      PathOperations.join(tempDir, 'src', 'app', 'data.ts'),
      'export const data = 1;\n'
    );
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
    it('should return LawResult with expected structure', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should include details array with violations and suggestions', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe('CDN configuration check', () => {
    it('should pass when all checks pass', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: true },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe(
        'CDN and caching strategy properly implemented'
      );
    });

    it('should add violation when CDN is not configured', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        CachingStrategies.VIOLATION_MESSAGES.CDN_NOT_IMPLEMENTED
      );
      expect(result.suggestions).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.CDN_CONFIG
      );
      expect(result.score).toBe(
        100 - CachingStrategies.SCORE_DEDUCTIONS.CDN_NOT_CONFIGURED
      );
    });

    it('should add violation when asset optimization is not configured', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: true },
        assetOptimization: { optimized: false },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        CachingStrategies.VIOLATION_MESSAGES.ASSET_NOT_OPTIMIZED
      );
      expect(result.suggestions).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.ASSET_OPTIMIZATION
      );
      expect(result.score).toBe(
        100 - CachingStrategies.SCORE_DEDUCTIONS.ASSET_OPTIMIZATION_MISSING
      );
    });

    it('should add violation when caching headers are not configured', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: true },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: false },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        CachingStrategies.VIOLATION_MESSAGES.CACHING_HEADERS_NOT_CONFIGURED
      );
      expect(result.suggestions).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.CACHING_HEADERS
      );
      expect(result.score).toBe(
        100 - CachingStrategies.SCORE_DEDUCTIONS.BROWSER_CACHING_NOT_CONFIGURED
      );
    });

    it('should add violation when service worker is not implemented', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: true },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: false },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        CachingStrategies.VIOLATION_MESSAGES.SERVICE_WORKER_NOT_IMPLEMENTED
      );
      expect(result.suggestions).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.SERVICE_WORKER
      );
      expect(result.score).toBe(
        100 - CachingStrategies.SCORE_DEDUCTIONS.SERVICE_WORKER_NOT_IMPLEMENTED
      );
    });

    it('should add violation when HTTP/2 optimization is not configured', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: true },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: false },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        CachingStrategies.VIOLATION_MESSAGES.HTTP2_NOT_OPTIMIZED
      );
      expect(result.suggestions).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.HTTP2_OPTIMIZATION
      );
      expect(result.score).toBe(
        100 - CachingStrategies.SCORE_DEDUCTIONS.HTTP2_NOT_OPTIMIZED
      );
    });

    it('should accumulate multiple violations', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: false },
        cachingHeaders: { configured: false },
        serviceWorker: { implemented: false },
        http2Optimization: { optimized: false },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(5);
      expect(result.suggestions).toHaveLength(5);
      expect(result.score).toBe(0);
    });

    it('should calculate correct score with multiple violations', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: false },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      const expectedScore =
        100 -
        CachingStrategies.SCORE_DEDUCTIONS.CDN_NOT_CONFIGURED -
        CachingStrategies.SCORE_DEDUCTIONS.ASSET_OPTIMIZATION_MISSING;
      expect(result.score).toBe(expectedScore);
    });

    it('should cap score at 0 when penalties exceed 100', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: false },
        cachingHeaders: { configured: false },
        serviceWorker: { implemented: false },
        http2Optimization: { optimized: false },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.score).toBe(0);
    });

    it('should join violations in message when there are violations', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: false },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.message).toContain('CDN and caching issues found');
      expect(result.message).toContain(
        CachingStrategies.VIOLATION_MESSAGES.CDN_NOT_IMPLEMENTED
      );
      expect(result.message).toContain(
        CachingStrategies.VIOLATION_MESSAGES.ASSET_NOT_OPTIMIZED
      );
    });

    it('should include both violations and suggestions in details', async () => {
      jest.spyOn(CdnCachingStrategyAnalyzerService, 'analyze').mockResolvedValue({
        cdnConfigured: { configured: false },
        assetOptimization: { optimized: true },
        cachingHeaders: { configured: true },
        serviceWorker: { implemented: true },
        http2Optimization: { optimized: true },
      });

      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.details).toContain(
        CachingStrategies.VIOLATION_MESSAGES.CDN_NOT_IMPLEMENTED
      );
      expect(result.details).toContain(
        CachingStrategies.SUGGESTION_MESSAGES.CDN_CONFIG
      );
    });
  });
});
