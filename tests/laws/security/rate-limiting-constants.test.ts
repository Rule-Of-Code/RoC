/**
 * Tests for RateLimitingConstants
 */
import { RateLimitingConstants } from '../../../src/laws/security/api-security/constants/rate-limiting';

describe('RateLimitingConstants', () => {
  describe('RATE_LIMIT_PATTERNS', () => {
    it('should have CLIENT_RATE_LIMIT pattern', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.CLIENT_RATE_LIMIT
      ).toBeInstanceOf(RegExp);
    });

    it('should have SERVER_RATE_LIMIT pattern', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.SERVER_RATE_LIMIT
      ).toBeInstanceOf(RegExp);
    });

    it('should have CORS_FUNCTION pattern', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.CORS_FUNCTION
      ).toBeInstanceOf(RegExp);
    });

    it('CLIENT_RATE_LIMIT should match rateLimit', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.CLIENT_RATE_LIMIT.test(
          'rateLimit(100)'
        )
      ).toBe(true);
    });

    it('CLIENT_RATE_LIMIT should match throttle', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.CLIENT_RATE_LIMIT.test(
          'throttle(1000)'
        )
      ).toBe(true);
    });

    it('SERVER_RATE_LIMIT should match limit_req', () => {
      expect(
        RateLimitingConstants.RATE_LIMIT_PATTERNS.SERVER_RATE_LIMIT.test(
          'limit_req zone=one'
        )
      ).toBe(true);
    });
  });

  describe('INTERCEPTOR_PATTERNS', () => {
    it('should have INTERCEPTOR_FILE pattern', () => {
      expect(
        RateLimitingConstants.INTERCEPTOR_PATTERNS.INTERCEPTOR_FILE
      ).toBeInstanceOf(RegExp);
    });

    it('should have RATE_LIMIT pattern', () => {
      expect(
        RateLimitingConstants.INTERCEPTOR_PATTERNS.RATE_LIMIT
      ).toBeInstanceOf(RegExp);
    });

    it('INTERCEPTOR_FILE should match .interceptor.ts', () => {
      expect(
        RateLimitingConstants.INTERCEPTOR_PATTERNS.INTERCEPTOR_FILE.test(
          'rate-limit.interceptor.ts'
        )
      ).toBe(true);
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include nginx.conf', () => {
      expect(RateLimitingConstants.CONFIG_FILES).toContain('nginx.conf');
    });

    it('should include server.ts', () => {
      expect(RateLimitingConstants.CONFIG_FILES).toContain('server.ts');
    });

    it('should include main.ts', () => {
      expect(RateLimitingConstants.CONFIG_FILES).toContain('main.ts');
    });
  });

  describe('FUNCTIONS_PATH', () => {
    it('should be functions', () => {
      expect(RateLimitingConstants.FUNCTIONS_PATH).toBe('functions');
    });
  });

  describe('hasRateLimitPattern()', () => {
    it('should return true for rateLimit', () => {
      expect(
        RateLimitingConstants.hasRateLimitPattern('app.use(rateLimit(config))')
      ).toBe(true);
    });

    it('should return true for throttle', () => {
      expect(
        RateLimitingConstants.hasRateLimitPattern('pipe(throttle(1000))')
      ).toBe(true);
    });

    it('should return true for limit_req', () => {
      expect(
        RateLimitingConstants.hasRateLimitPattern('limit_req zone=api')
      ).toBe(true);
    });

    it('should return false for no rate limiting', () => {
      expect(
        RateLimitingConstants.hasRateLimitPattern('app.use(helmet())')
      ).toBe(false);
    });
  });

  describe('hasMissingCorsInFunction()', () => {
    it('should return true for https.onRequest without cors', () => {
      expect(
        RateLimitingConstants.hasMissingCorsInFunction(
          'exports.api = https.onRequest((req, res) => {})'
        )
      ).toBe(true);
    });

    it('should return false for https.onRequest with cors', () => {
      const content =
        'exports.api = https.onRequest((req, res) => { cors(req, res) })';
      expect(RateLimitingConstants.hasMissingCorsInFunction(content)).toBe(
        false
      );
    });

    it('should return false for no onRequest', () => {
      expect(
        RateLimitingConstants.hasMissingCorsInFunction(
          'exports.trigger = functions.firestore.document()'
        )
      ).toBe(false);
    });
  });
});
