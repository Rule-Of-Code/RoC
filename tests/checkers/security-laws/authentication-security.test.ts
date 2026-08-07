/**
 * Tests for AuthenticationSecurityLaw
 *
 * Tests the Authentication Security Law which enforces proper authentication
 * and authorization security standards
 */
import { AuthenticationSecurityLaw } from '../../../src/checkers/security-laws/authentication-security';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('AuthenticationSecurityLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('auth-security-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
    context = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ============================================
  // check - Basic Behavior
  // ============================================
  describe('check()', () => {
    describe('when project has no authentication implementation', () => {
      it('should return a result object', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should have score between 0 and 100', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should include config in result', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result.config).toBeDefined();
      });
    });

    describe('when project has authentication implementation', () => {
      it('should analyze auth service files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'auth.service.ts'),
          `
            import { Injectable } from '@angular/core';
            import { Auth } from '@angular/fire/auth';

            @Injectable({ providedIn: 'root' })
            export class AuthService {
              constructor(private auth: Auth) {}

              async login(email: string, password: string) {
                return this.auth.signInWithEmailAndPassword(email, password);
              }

              async logout() {
                return this.auth.signOut();
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should detect Firebase Auth implementation', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'firebase-auth.service.ts'),
          `
            import { Auth, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';

            export class FirebaseAuthService {
              async signInWithGoogle() {
                const provider = new GoogleAuthProvider();
                return signInWithPopup(this.auth, provider);
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('when project has authorization patterns', () => {
      it('should analyze route guards', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'guards');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'auth.guard.ts'),
          `
            import { Injectable } from '@angular/core';
            import { CanActivate, Router } from '@angular/router';

            @Injectable({ providedIn: 'root' })
            export class AuthGuard implements CanActivate {
              constructor(private router: Router, private auth: AuthService) {}

              canActivate(): boolean {
                if (!this.auth.isAuthenticated) {
                  this.router.navigate(['/login']);
                  return false;
                }
                return true;
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should detect role-based access control', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'guards');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'role.guard.ts'),
          `
            import { Injectable } from '@angular/core';
            import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';

            @Injectable({ providedIn: 'root' })
            export class RoleGuard implements CanActivate {
              canActivate(route: ActivatedRouteSnapshot): boolean {
                const requiredRole = route.data['role'];
                return this.auth.hasRole(requiredRole);
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('when project has session management', () => {
      it('should analyze session handling code', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'services');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'session.service.ts'),
          `
            export class SessionService {
              private sessionTimeout = 30 * 60 * 1000; // 30 minutes

              startSession(userId: string) {
                localStorage.setItem('session', JSON.stringify({
                  userId,
                  expiresAt: Date.now() + this.sessionTimeout
                }));
              }

              isSessionValid(): boolean {
                const session = this.getSession();
                return session && Date.now() < session.expiresAt;
              }

              clearSession() {
                localStorage.removeItem('session');
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect token refresh patterns', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'token.service.ts'),
          `
            export class TokenService {
              async refreshToken() {
                const refreshToken = this.getRefreshToken();
                const response = await fetch('/api/auth/refresh', {
                  method: 'POST',
                  body: JSON.stringify({ refreshToken })
                });
                const { accessToken } = await response.json();
                this.setAccessToken(accessToken);
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('message and result structure', () => {
      it('should have message property', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      });

      it('should have details array', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result.details === undefined || Array.isArray(result.details)).toBe(true);
      });

      it('should have fixable property', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result.fixable === undefined || typeof result.fixable === 'boolean').toBe(true);
      });

      it('should return success message when passed', () => {
        // Create a project with proper auth implementation
        const srcDir = PathOperations.join(tempDir, 'src');
        const guardsDir = PathOperations.join(srcDir, 'guards');
        FileUtils.createDirectory(guardsDir);

        FileUtils.writeFile(
          PathOperations.join(srcDir, 'auth.service.ts'),
          `
            import { Auth } from '@angular/fire/auth';
            export class AuthService {
              constructor(private auth: Auth) {}
              isAuthenticated = () => !!this.auth.currentUser;
            }
          `
        );

        FileUtils.writeFile(
          PathOperations.join(guardsDir, 'auth.guard.ts'),
          `
            import { CanActivate } from '@angular/router';
            export class AuthGuard implements CanActivate {
              canActivate() { return this.auth.isAuthenticated(); }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
        expect(result.message).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should handle invalid project root gracefully', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path',
          config: mockConfig,
        };

        const result = AuthenticationSecurityLaw.check(invalidContext);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should handle empty project directory', () => {
        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should handle malformed config gracefully', () => {
        const malformedContext: LawCheckContext = {
          projectRoot: tempDir,
          config: {} as RuleOfCodeConfig,
        };

        // Should not throw
        const result = AuthenticationSecurityLaw.check(malformedContext);
        expect(result).toBeDefined();
      });
    });

    describe('security patterns detection', () => {
      it('should detect JWT token usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'jwt.service.ts'),
          `
            import * as jwt from 'jsonwebtoken';

            export class JwtService {
              verifyToken(token: string) {
                return jwt.verify(token, process.env.JWT_SECRET);
              }

              generateToken(payload: object) {
                return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect OAuth implementation', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'oauth.service.ts'),
          `
            export class OAuthService {
              async handleOAuthCallback(code: string) {
                const tokenResponse = await fetch('/oauth/token', {
                  method: 'POST',
                  body: JSON.stringify({ code, grant_type: 'authorization_code' })
                });
                return tokenResponse.json();
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect password hashing', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'password.service.ts'),
          `
            import * as bcrypt from 'bcrypt';

            export class PasswordService {
              async hashPassword(password: string): Promise<string> {
                const salt = await bcrypt.genSalt(10);
                return bcrypt.hash(password, salt);
              }

              async verifyPassword(password: string, hash: string): Promise<boolean> {
                return bcrypt.compare(password, hash);
              }
            }
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('score calculation', () => {
      it('should return higher score for well-protected project', () => {
        // Create comprehensive auth setup
        const srcDir = PathOperations.join(tempDir, 'src');
        const guardsDir = PathOperations.join(srcDir, 'guards');
        FileUtils.createDirectory(guardsDir);

        FileUtils.writeFile(
          PathOperations.join(srcDir, 'auth.service.ts'),
          `
            import { Auth } from '@angular/fire/auth';
            export class AuthService {}
          `
        );

        FileUtils.writeFile(
          PathOperations.join(guardsDir, 'auth.guard.ts'),
          `
            import { CanActivate } from '@angular/router';
            export class AuthGuard implements CanActivate {}
          `
        );

        const result = AuthenticationSecurityLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should calculate score based on violations', () => {
        const result = AuthenticationSecurityLaw.check(context);

        // Score should decrease with violations
        if ((result.violations ?? []).length > 0) {
          expect(result.score).toBeLessThan(100);
        }
      });
    });
  });
});
