/**
 * @fileoverview Tests for APISecurityAnalyzerService
 * @description Tests for the API Security Coordinator Service
 */

import { APISecurityAnalyzerService } from '../../../../../src/laws/security/api-security/services/api-security-coordinator.service';
import { ConfigFileUtils } from '../../../../../src/utils/config-file-utils';
import { FileUtils } from '../../../../../src/utils/file-utils';
import { PathOperations } from '../../../../../src/utils/path-operations';

describe('laws/security/api-security/services/api-security-coordinator.service', () => {
  let tempDir: string;
  let defaultConfig: ReturnType<typeof ConfigFileUtils.getMinimalDefaultConfig>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('api-security-coordinator-test-');
    defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('APISecurityAnalyzerService.analyze', () => {
    it('should return an array of violations', () => {
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should return violations for empty project', () => {
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect missing rate limiting on a BACKEND that lacks it', () => {
      // Rate limiting is a backend concern; it is only faulted when there is a
      // server surface to throttle. An empty project (or a pure SPA) is no longer
      // falsely flagged.
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        `import express from 'express';\nconst app = express();\napp.get('/x', (r, s) => s.send('hi'));`
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasRateLimitViolation = violations.some((v: string) =>
        v.includes('rate limit')
      );
      expect(hasRateLimitViolation).toBe(true);
    });

    it('should NOT fault a project with no backend surface for rate limiting', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        `export class AppComponent { title = 'ui'; }`
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(violations.some((v: string) => v.includes('rate limit'))).toBe(
        false
      );
    });

    it('should detect missing authentication service', () => {
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasAuthViolation = violations.some((v: string) =>
        v.includes('authentication')
      );
      expect(hasAuthViolation).toBe(true);
    });

    it('should include HTTPS enforcement violations', () => {
      // Create firebase.json without HTTPS
      const firebaseConfig = JSON.stringify({
        hosting: { public: 'dist' },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        firebaseConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasHttpsViolation = violations.some((v: string) =>
        v.includes('HTTPS')
      );
      expect(hasHttpsViolation).toBe(true);
    });

    it('should check CORS configuration', () => {
      // Create proxy.conf.json without CORS headers
      const proxyConfig = JSON.stringify({
        '/api': {
          target: 'http://localhost:3000',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'proxy.conf.json'),
        proxyConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasCorsViolation = violations.some((v: string) =>
        v.includes('CORS')
      );
      expect(hasCorsViolation).toBe(true);
    });

    it('should aggregate violations from all analyzers', () => {
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should have multiple types of violations
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should handle non-existent project root', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

      // Should not throw
      const violations = APISecurityAnalyzerService.analyze(
        nonExistentPath,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('HTTPS Enforcement Analysis', () => {
    it('should pass when firebase.json has HTTPS redirect', () => {
      const firebaseConfig = JSON.stringify({
        hosting: {
          redirects: [{ source: '**', destination: '/https' }],
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        firebaseConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasHttpsRedirectViolation = violations.some(
        (v: string) => v.includes('HTTPS redirect') && v.includes('firebase')
      );
      expect(hasHttpsRedirectViolation).toBe(false);
    });

    it('should detect missing SSL in nginx.conf', () => {
      const nginxConfig = `
        server {
          listen 80;
          server_name example.com;
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasSslViolation = violations.some((v: string) => v.includes('SSL'));
      expect(hasSslViolation).toBe(true);
    });

    it('should pass when nginx.conf has SSL configuration', () => {
      const nginxConfig = `
        server {
          listen 443 ssl;
          ssl_certificate /etc/nginx/ssl/cert.pem;
          ssl_certificate_key /etc/nginx/ssl/key.pem;
          server_name example.com;
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasSslViolation = violations.some(
        (v: string) => v.includes('SSL') && v.includes('nginx')
      );
      expect(hasSslViolation).toBe(false);
    });

    it('should analyze project with .env file', () => {
      const envContent = `
        API_URL=http://api.production.com
        DATABASE_URL=mongodb://localhost:27017
      `;
      FileUtils.writeFile(PathOperations.join(tempDir, '.env'), envContent);

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze without throwing and return violations array
      expect(Array.isArray(violations)).toBe(true);
      // Empty project should still have general violations
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Analysis', () => {
    it('should detect auth service with proper Authorization header handling', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const authContent = `
        @Injectable({ providedIn: 'root' })
        export class AuthService {
          getHeaders() {
            return { Authorization: 'Bearer ' + this.token };
          }
          refreshToken() {
            // Token refresh logic
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.service.ts'),
        authContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoAuthViolation = violations.some(
        (v: string) => v === 'No authentication service implementation found'
      );
      expect(hasNoAuthViolation).toBe(false);
    });

    it('should detect missing token refresh mechanism', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const authContent = `
        @Injectable({ providedIn: 'root' })
        export class AuthService {
          login() { return this.http.post('/login', {}); }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.service.ts'),
        authContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasRefreshViolation = violations.some((v: string) =>
        v.includes('token refresh')
      );
      expect(hasRefreshViolation).toBe(true);
    });

    it('should detect insecure token storage in localStorage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const authContent = `
        @Injectable({ providedIn: 'root' })
        export class AuthService {
          getToken() {
            return localStorage.getItem('token');
          }
          setToken(token: string) {
            localStorage.setItem('token', token);
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.service.ts'),
        authContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasInsecureStorageViolation = violations.some(
        (v: string) =>
          v.includes('localStorage') || v.includes('Insecure token storage')
      );
      expect(hasInsecureStorageViolation).toBe(true);
    });
  });

  describe('Rate Limiting Analysis', () => {
    it('should pass when rate limiting is implemented', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const serverContent = `
        import express from 'express';
        import rateLimit from 'express-rate-limit';

        const limiter = rateLimit({
          windowMs: 15 * 60 * 1000,
          max: 100
        });

        const app = express();
        app.use(limiter);
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        serverContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoRateLimitViolation = violations.some(
        (v: string) => v === 'No rate limiting implementation found'
      );
      expect(hasNoRateLimitViolation).toBe(false);
    });

    it('should detect missing CORS in Firebase functions', () => {
      const functionsDir = PathOperations.join(tempDir, 'functions', 'src');
      FileUtils.createDirectory(functionsDir);

      const functionsContent = `
        import * as functions from 'firebase-functions';

        export const api = functions.https.onRequest((req, res) => {
          res.send('Hello');
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(functionsDir, 'index.ts'),
        functionsContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasFunctionsCorsViolation = violations.some(
        (v: string) => v.includes('HTTPS function') && v.includes('CORS')
      );
      expect(hasFunctionsCorsViolation).toBe(true);
    });
  });

  describe('Input Validation Analysis', () => {
    it('should detect FormControl without validators', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({ selector: 'app-form' })
        export class FormComponent {
          email = new FormControl('');
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'form.component.ts'),
        componentContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasFormControlViolation = violations.some(
        (v: string) => v.includes('FormControl') || v.includes('validators')
      );
      expect(hasFormControlViolation).toBe(true);
    });

    it('should detect XSS vulnerability with innerHTML', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        import { Component, ElementRef } from '@angular/core';

        @Component({ selector: 'app-xss' })
        export class XssComponent {
          setContent(content: string) {
            this.el.nativeElement.innerHTML = content;
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'xss.component.ts'),
        componentContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasXssViolation = violations.some(
        (v: string) => v.includes('innerHTML') || v.includes('XSS')
      );
      expect(hasXssViolation).toBe(true);
    });
  });

  describe('CORS Analysis', () => {
    it('should detect missing CORS headers in proxy config', () => {
      const proxyConfig = JSON.stringify({
        '/api': {
          target: 'http://localhost:3000',
          secure: false,
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'proxy.conf.json'),
        proxyConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasCorsViolation = violations.some(
        (v: string) => v.includes('CORS') && v.includes('proxy')
      );
      expect(hasCorsViolation).toBe(true);
    });

    it('should pass when proxy config has CORS headers', () => {
      const proxyConfig = JSON.stringify({
        '/api': {
          target: 'http://localhost:3000',
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'proxy.conf.json'),
        proxyConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasCorsViolation = violations.some(
        (v: string) => v.includes('CORS') && v.includes('proxy')
      );
      expect(hasCorsViolation).toBe(false);
    });

    it('should detect Express server missing CORS', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const serverContent = `
        import express from 'express';

        const app = express();
        app.use(express.json());
        app.get('/api', (req, res) => res.json({ data: 'test' }));
        app.listen(3000);
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        serverContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasExpressCorsViolation = violations.some(
        (v: string) => v.includes('Express') && v.includes('CORS')
      );
      expect(hasExpressCorsViolation).toBe(true);
    });
  });

  describe('Security Headers Analysis', () => {
    it('should detect missing security headers in nginx.conf', () => {
      const nginxConfig = `
        server {
          listen 443 ssl;
          ssl_certificate /etc/nginx/ssl/cert.pem;
          server_name example.com;

          location / {
            root /var/www/html;
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxConfig
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasSecurityHeadersViolation = violations.some((v: string) =>
        v.includes('security header')
      );
      expect(hasSecurityHeadersViolation).toBe(true);
    });

    it('should detect missing security headers in interceptors', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const interceptorContent = `
        import { Injectable } from '@angular/core';
        import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

        @Injectable()
        export class AuthInterceptor implements HttpInterceptor {
          intercept(req: HttpRequest<any>, next: HttpHandler) {
            return next.handle(req);
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.interceptor.ts'),
        interceptorContent
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasInterceptorViolation = violations.some(
        (v: string) =>
          v.includes('security headers') && v.includes('interceptor')
      );
      expect(hasInterceptorViolation).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config object', () => {
      const emptyConfig = {} as ReturnType<
        typeof ConfigFileUtils.getMinimalDefaultConfig
      >;

      // Should not throw
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        emptyConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle malformed JSON files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        '{ invalid }'
      );

      // Should not throw
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle empty files', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'firebase.json'), '');

      // Should not throw
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle files with only whitespace', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.service.ts'),
        '   \n\n   '
      );

      // Should not throw
      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle deeply nested directories', () => {
      const deepDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'modules',
        'core',
        'services'
      );
      FileUtils.createDirectory(deepDir);

      FileUtils.writeFile(
        PathOperations.join(deepDir, 'deep.service.ts'),
        'export class DeepService {}'
      );

      const violations = APISecurityAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });
  });
});
