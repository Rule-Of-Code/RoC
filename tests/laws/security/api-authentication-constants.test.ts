/**
 * Tests for APIAuthenticationConstants
 */
import { APIAuthenticationConstants } from '../../../src/laws/security/api-security/constants/api-authentication';

describe('APIAuthenticationConstants', () => {
  describe('AUTH_PATTERNS', () => {
    it('should have AUTHORIZATION_HEADER pattern', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.AUTHORIZATION_HEADER
      ).toBeInstanceOf(RegExp);
    });

    it('should have TOKEN_REFRESH pattern', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.TOKEN_REFRESH
      ).toBeInstanceOf(RegExp);
    });

    it('should have SECURE_STORAGE pattern', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.SECURE_STORAGE
      ).toBeInstanceOf(RegExp);
    });

    it('should have AUTH_SERVICE pattern', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.AUTH_SERVICE
      ).toBeInstanceOf(RegExp);
    });

    it('AUTHORIZATION_HEADER should match Authorization', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.AUTHORIZATION_HEADER.test(
          'Authorization'
        )
      ).toBe(true);
    });

    it('AUTHORIZATION_HEADER should match Bearer', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.AUTHORIZATION_HEADER.test(
          'Bearer token'
        )
      ).toBe(true);
    });

    it('TOKEN_REFRESH should match refresh', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.TOKEN_REFRESH.test(
          'refreshToken'
        )
      ).toBe(true);
    });

    it('TOKEN_REFRESH should match renew', () => {
      expect(
        APIAuthenticationConstants.AUTH_PATTERNS.TOKEN_REFRESH.test(
          'renewSession'
        )
      ).toBe(true);
    });
  });

  describe('INSECURE_PATTERNS', () => {
    it('should have LOCALSTORAGE pattern', () => {
      expect(
        APIAuthenticationConstants.INSECURE_PATTERNS.LOCALSTORAGE
      ).toBeInstanceOf(RegExp);
    });

    it('should have SESSIONSTORAGE pattern', () => {
      expect(
        APIAuthenticationConstants.INSECURE_PATTERNS.SESSIONSTORAGE
      ).toBeInstanceOf(RegExp);
    });

    it('LOCALSTORAGE should match localStorage', () => {
      expect(
        APIAuthenticationConstants.INSECURE_PATTERNS.LOCALSTORAGE.test(
          'localStorage.getItem'
        )
      ).toBe(true);
    });

    it('SESSIONSTORAGE should match sessionStorage', () => {
      expect(
        APIAuthenticationConstants.INSECURE_PATTERNS.SESSIONSTORAGE.test(
          'sessionStorage.setItem'
        )
      ).toBe(true);
    });
  });

  describe('AUTH_FILES', () => {
    it('should include auth.service.ts', () => {
      expect(APIAuthenticationConstants.AUTH_FILES).toContain(
        'auth.service.ts'
      );
    });

    it('should include authentication.service.ts', () => {
      expect(APIAuthenticationConstants.AUTH_FILES).toContain(
        'authentication.service.ts'
      );
    });

    it('should include token.service.ts', () => {
      expect(APIAuthenticationConstants.AUTH_FILES).toContain(
        'token.service.ts'
      );
    });
  });

  describe('hasAuthorizationHandling()', () => {
    it('should return true for content with Authorization', () => {
      expect(
        APIAuthenticationConstants.hasAuthorizationHandling(
          'headers: { Authorization: token }'
        )
      ).toBe(true);
    });

    it('should return true for content with Bearer', () => {
      expect(
        APIAuthenticationConstants.hasAuthorizationHandling('Bearer token123')
      ).toBe(true);
    });

    it('should return false for content without auth', () => {
      expect(
        APIAuthenticationConstants.hasAuthorizationHandling(
          'console.log("hello")'
        )
      ).toBe(false);
    });
  });

  describe('hasTokenRefreshMechanism()', () => {
    it('should return true for content with refresh', () => {
      expect(
        APIAuthenticationConstants.hasTokenRefreshMechanism('refreshToken()')
      ).toBe(true);
    });

    it('should return true for content with renew', () => {
      expect(
        APIAuthenticationConstants.hasTokenRefreshMechanism('renewSession()')
      ).toBe(true);
    });

    it('should return false for content without refresh', () => {
      expect(
        APIAuthenticationConstants.hasTokenRefreshMechanism('getToken()')
      ).toBe(false);
    });
  });

  describe('hasInsecureTokenStorage()', () => {
    it('should return true for localStorage without secure', () => {
      expect(
        APIAuthenticationConstants.hasInsecureTokenStorage(
          'localStorage.setItem("token", x)'
        )
      ).toBe(true);
    });

    it('should return false for localStorage with secure/encrypt', () => {
      const content = 'localStorage.setItem("token", encrypt(x))';
      expect(APIAuthenticationConstants.hasInsecureTokenStorage(content)).toBe(
        false
      );
    });

    it('should return false for secure storage', () => {
      expect(
        APIAuthenticationConstants.hasInsecureTokenStorage(
          'secureStorage.save()'
        )
      ).toBe(false);
    });
  });
});
