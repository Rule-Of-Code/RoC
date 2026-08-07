/**
 * Tests for CdnCachingStrategyCachingStrategiesConstants
 *
 * Tests the CDN caching strategy configuration and constants.
 */
import { CdnCachingStrategyCachingStrategiesConstants } from '../../../src/laws/performance/cdn-caching-strategy/constants/caching-strategies';

describe('CdnCachingStrategyCachingStrategiesConstants', () => {
  describe('SCORE_DEDUCTIONS', () => {
    it('should have CDN_NOT_CONFIGURED deduction', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .CDN_NOT_CONFIGURED
      ).toBeDefined();
    });

    it('should have ASSET_OPTIMIZATION_MISSING deduction', () => {
      expect(
        typeof CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .ASSET_OPTIMIZATION_MISSING
      ).toBe('number');
    });

    it('should have highest deduction for CDN not configured', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .CDN_NOT_CONFIGURED
      ).toBeGreaterThan(
        CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .BROWSER_CACHING_NOT_CONFIGURED
      );
    });

    it('should have SERVICE_WORKER_NOT_IMPLEMENTED deduction', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .SERVICE_WORKER_NOT_IMPLEMENTED
      ).toBeDefined();
    });

    it('should have HTTP2_NOT_OPTIMIZED deduction', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SCORE_DEDUCTIONS
          .HTTP2_NOT_OPTIMIZED
      ).toBeDefined();
    });
  });

  describe('VIOLATION_MESSAGES', () => {
    it('should have CDN_NOT_IMPLEMENTED message', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.VIOLATION_MESSAGES
          .CDN_NOT_IMPLEMENTED
      ).toBe('CDN configuration not implemented');
    });

    it('should have ASSET_NOT_OPTIMIZED message', () => {
      expect(
        typeof CdnCachingStrategyCachingStrategiesConstants.VIOLATION_MESSAGES
          .ASSET_NOT_OPTIMIZED
      ).toBe('string');
    });

    it('should have CACHING_HEADERS_NOT_CONFIGURED message', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.VIOLATION_MESSAGES
          .CACHING_HEADERS_NOT_CONFIGURED
      ).toBeDefined();
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    it('should have CDN_CONFIG suggestion', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SUGGESTION_MESSAGES
          .CDN_CONFIG
      ).toContain('CDN');
    });

    it('should have ASSET_OPTIMIZATION suggestion', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SUGGESTION_MESSAGES
          .ASSET_OPTIMIZATION
      ).toBeDefined();
    });

    it('should have CACHING_HEADERS suggestion', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SUGGESTION_MESSAGES
          .CACHING_HEADERS
      ).toContain('Cache-Control');
    });

    it('should have SERVICE_WORKER suggestion', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SUGGESTION_MESSAGES
          .SERVICE_WORKER
      ).toContain('service worker');
    });

    it('should have HTTP2_OPTIMIZATION suggestion', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SUGGESTION_MESSAGES
          .HTTP2_OPTIMIZATION
      ).toContain('HTTP/2');
    });
  });

  describe('CDN_PROVIDERS', () => {
    it('should include cloudflare', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CDN_PROVIDERS
      ).toContain('cloudflare');
    });

    it('should include cloudfront', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CDN_PROVIDERS
      ).toContain('cloudfront');
    });

    it('should include firebase', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CDN_PROVIDERS
      ).toContain('firebase');
    });

    it('should include cdn', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CDN_PROVIDERS
      ).toContain('cdn');
    });
  });

  describe('CACHE_CONTROL_KEYWORDS', () => {
    it('should include Cache-Control', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CACHE_CONTROL_KEYWORDS
      ).toContain('Cache-Control');
    });

    it('should include Expires', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CACHE_CONTROL_KEYWORDS
      ).toContain('Expires');
    });

    it('should include ETag', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.CACHE_CONTROL_KEYWORDS
      ).toContain('ETag');
    });
  });

  describe('HTTP2_KEYWORDS', () => {
    it('should include http2', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.HTTP2_KEYWORDS
      ).toContain('http2');
    });

    it('should include HTTP/2', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.HTTP2_KEYWORDS
      ).toContain('HTTP/2');
    });

    it('should include push', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.HTTP2_KEYWORDS
      ).toContain('push');
    });
  });

  describe('OPTIMIZATION_KEYWORDS', () => {
    it('should include contenthash', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.OPTIMIZATION_KEYWORDS
      ).toContain('contenthash');
    });

    it('should include chunkhash', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.OPTIMIZATION_KEYWORDS
      ).toContain('chunkhash');
    });

    it('should include splitChunks', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.OPTIMIZATION_KEYWORDS
      ).toContain('splitChunks');
    });
  });

  describe('SERVICE_WORKER_KEYWORDS', () => {
    it('should include serviceWorker', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SERVICE_WORKER_KEYWORDS
      ).toContain('serviceWorker');
    });

    it('should include @angular/service-worker', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SERVICE_WORKER_KEYWORDS
      ).toContain('@angular/service-worker');
    });

    it('should include registerSW', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SERVICE_WORKER_KEYWORDS
      ).toContain('registerSW');
    });

    it('should include SwUpdate', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.SERVICE_WORKER_KEYWORDS
      ).toContain('SwUpdate');
    });
  });

  describe('ASSET_OPTIMIZATION_INDICATORS', () => {
    it('should include deployUrl', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.ASSET_OPTIMIZATION_INDICATORS
      ).toContain('deployUrl');
    });

    it('should include baseHref', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.ASSET_OPTIMIZATION_INDICATORS
      ).toContain('baseHref');
    });

    it('should include optimization', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.ASSET_OPTIMIZATION_INDICATORS
      ).toContain('optimization');
    });

    it('should include outputHashing', () => {
      expect(
        CdnCachingStrategyCachingStrategiesConstants.ASSET_OPTIMIZATION_INDICATORS
      ).toContain('outputHashing');
    });
  });
});
