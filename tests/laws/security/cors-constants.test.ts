/**
 * Tests for CORSConstants
 */
import { CORSConstants } from '../../../src/laws/security/api-security/constants/cors';

describe('CORSConstants', () => {
  describe('CORS_PATTERNS', () => {
    it('should have CORS_MIDDLEWARE pattern', () => {
      expect(CORSConstants.CORS_PATTERNS.CORS_MIDDLEWARE).toBeInstanceOf(
        RegExp
      );
    });

    it('should have ACCESS_CONTROL_HEADER pattern', () => {
      expect(CORSConstants.CORS_PATTERNS.ACCESS_CONTROL_HEADER).toBeInstanceOf(
        RegExp
      );
    });

    it('should have EXPRESS pattern', () => {
      expect(CORSConstants.CORS_PATTERNS.EXPRESS).toBeInstanceOf(RegExp);
    });

    it('CORS_MIDDLEWARE should match cors', () => {
      expect(
        CORSConstants.CORS_PATTERNS.CORS_MIDDLEWARE.test('app.use(cors())')
      ).toBe(true);
    });

    it('ACCESS_CONTROL_HEADER should match Access-Control-Allow-Origin', () => {
      expect(
        CORSConstants.CORS_PATTERNS.ACCESS_CONTROL_HEADER.test(
          'Access-Control-Allow-Origin: *'
        )
      ).toBe(true);
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include proxy.conf.json', () => {
      expect(CORSConstants.CONFIG_FILES).toContain('proxy.conf.json');
    });

    it('should include functions/src/index.ts', () => {
      expect(CORSConstants.CONFIG_FILES).toContain('functions/src/index.ts');
    });

    it('should include server.ts', () => {
      expect(CORSConstants.CONFIG_FILES).toContain('server.ts');
    });

    it('should include main.ts', () => {
      expect(CORSConstants.CONFIG_FILES).toContain('main.ts');
    });

    it('should include app.ts', () => {
      expect(CORSConstants.CONFIG_FILES).toContain('app.ts');
    });
  });

  describe('hasCorsMiddleware()', () => {
    it('should return true for content with cors()', () => {
      expect(CORSConstants.hasCorsMiddleware('app.use(cors())')).toBe(true);
    });

    it('should return true for content with CORS', () => {
      expect(CORSConstants.hasCorsMiddleware('enable CORS')).toBe(true);
    });

    it('should return false for content without cors', () => {
      expect(CORSConstants.hasCorsMiddleware('app.use(helmet())')).toBe(false);
    });
  });

  describe('hasAccessControlHeader()', () => {
    it('should return true for Access-Control-Allow-Origin', () => {
      expect(
        CORSConstants.hasAccessControlHeader('Access-Control-Allow-Origin: *')
      ).toBe(true);
    });

    it('should return false for content without header', () => {
      expect(
        CORSConstants.hasAccessControlHeader('Content-Type: application/json')
      ).toBe(false);
    });
  });

  describe('isExpressServerMissingCors()', () => {
    it('should return true for express without cors', () => {
      const content = 'const app = express(); app.use(helmet());';
      expect(CORSConstants.isExpressServerMissingCors(content)).toBe(true);
    });

    it('should return false for express with cors', () => {
      const content = 'const app = express(); app.use(cors());';
      expect(CORSConstants.isExpressServerMissingCors(content)).toBe(false);
    });

    it('should return false for non-express server', () => {
      expect(
        CORSConstants.isExpressServerMissingCors('const http = require("http")')
      ).toBe(false);
    });
  });
});
