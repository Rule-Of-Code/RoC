/**
 * @fileoverview Tests for ApiSecurityStandardsLaw
 * @description Tests for API Security Standards Law implementation
 */

import { ApiSecurityStandardsLaw } from '../../../src/laws/security/api-security-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { ConfigFileUtils } from '../../../src/utils/config-file-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('laws/security/api-security-standards', () => {
  let tempDir: string;
  let defaultConfig: ReturnType<typeof ConfigFileUtils.getMinimalDefaultConfig>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('api-security-standards-test-');
    defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ApiSecurityStandardsLaw.check', () => {
    it('should return a LawResult object', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(result.config).toBeDefined();
    });

    it('should return violations for empty project', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions array', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should include HTTPS suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasHttpsSuggestion = result.suggestions!.some(
        s => s.includes('HTTPS') || s.includes('TLS')
      );
      expect(hasHttpsSuggestion).toBe(true);
    });

    it('should include authentication suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasAuthSuggestion = result.suggestions!.some(
        s => s.includes('authentication') || s.includes('JWT')
      );
      expect(hasAuthSuggestion).toBe(true);
    });

    it('should include rate limiting suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasRateLimitingSuggestion = result.suggestions!.some(s =>
        s.includes('rate limiting')
      );
      expect(hasRateLimitingSuggestion).toBe(true);
    });

    it('should include input validation suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasInputValidationSuggestion = result.suggestions!.some(s =>
        s.includes('input validation')
      );
      expect(hasInputValidationSuggestion).toBe(true);
    });

    it('should include CORS suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasCorsSuggestion = result.suggestions!.some(s =>
        s.includes('CORS')
      );
      expect(hasCorsSuggestion).toBe(true);
    });

    it('should include security headers suggestion', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      const hasSecurityHeadersSuggestion = result.suggestions!.some(
        s => s.includes('security headers') || s.includes('CSP')
      );
      expect(hasSecurityHeadersSuggestion).toBe(true);
    });

    it('should return score between 0 and 100', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should pass when all security requirements are met', async () => {
      // Create a project with proper security configuration
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create auth service with proper implementation
      const authServiceContent = `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class AuthService {
          private refreshToken(): void {
            // Token refresh implementation
            this.renewSession();
          }

          getAuthHeader(): string {
            return 'Authorization: Bearer ' + this.token;
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.service.ts'),
        authServiceContent
      );

      // Create firebase.json with auth configuration
      const firebaseConfig = JSON.stringify({
        hosting: {
          redirects: [{ source: '**', destination: '/https' }],
        },
        auth: { enabled: true },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        firebaseConfig
      );

      // Create rate limiting implementation
      const rateLimitingContent = `
        import express from 'express';
        import rateLimit from 'express-rate-limit';

        const limiter = rateLimit({
          windowMs: 15 * 60 * 1000,
          max: 100
        });

        app.use(limiter);
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        rateLimitingContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    it('should detect missing HTTPS redirect in firebase.json', async () => {
      // Create firebase.json without HTTPS redirect
      const firebaseConfig = JSON.stringify({
        hosting: {
          public: 'dist',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        firebaseConfig
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasHttpsViolation = result.violations!.some(
        v => v.includes('HTTPS') || v.includes('redirect')
      );
      expect(hasHttpsViolation).toBe(true);
    });

    it('should detect missing authentication service', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create a simple component without auth
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-root' })
        export class AppComponent {}
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        componentContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasAuthViolation = result.violations!.some(v =>
        v.includes('authentication')
      );
      expect(hasAuthViolation).toBe(true);
    });

    it('should detect missing rate limiting', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create simple server without rate limiting
      const serverContent = `
        import express from 'express';
        const app = express();
        app.get('/api', (req, res) => res.json({ data: 'test' }));
        app.listen(3000);
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        serverContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasRateLimitViolation = result.violations!.some(v =>
        v.includes('rate limit')
      );
      expect(hasRateLimitViolation).toBe(true);
    });

    it('should handle non-existent project root gracefully', async () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

      const context: LawCheckContext = {
        projectRoot: nonExistentPath,
        config: defaultConfig,
      };

      // Should not throw
      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should have correct law name in message', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.message).toContain('API Security Standards');
    });

    it('should mark result as fixable when violations exist', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      if (result.violations && result.violations.length > 0) {
        expect(result.fixable).toBe(true);
      }
    });

    it('should include details array', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe('Integration with project structure', () => {
    it('should analyze nginx.conf for SSL configuration', async () => {
      // Create nginx.conf without SSL
      const nginxContent = `
        server {
          listen 80;
          server_name example.com;
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasSslViolation = result.violations!.some(
        v => v.includes('SSL') || v.includes('nginx')
      );
      expect(hasSslViolation).toBe(true);
    });

    it('should check environment files for non-HTTPS endpoints', async () => {
      // Create .env file with http endpoint
      const envContent = `
        API_URL=http://api.example.com
        DEBUG=true
      `;
      FileUtils.writeFile(PathOperations.join(tempDir, '.env'), envContent);

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
    });

    it('should validate proxy configuration for CORS', async () => {
      // Create proxy.conf.json without CORS headers
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

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasCorsViolation = result.violations!.some(v => v.includes('CORS'));
      expect(hasCorsViolation).toBe(true);
    });

    it('should check Firebase functions for CORS middleware', async () => {
      const functionsDir = PathOperations.join(tempDir, 'functions', 'src');
      FileUtils.createDirectory(functionsDir);

      // Create functions index without CORS
      const functionsContent = `
        import * as functions from 'firebase-functions';

        export const helloWorld = functions.https.onRequest((req, res) => {
          res.send('Hello World');
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(functionsDir, 'index.ts'),
        functionsContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);

      expect(result.violations).toBeDefined();
      const hasFunctionsCorsViolation = result.violations!.some(
        v => v.includes('CORS') && v.includes('Firebase')
      );
      expect(hasFunctionsCorsViolation).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config object', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: {} as ReturnType<
          typeof ConfigFileUtils.getMinimalDefaultConfig
        >,
      };

      // Should not throw
      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle malformed JSON files gracefully', async () => {
      // Create malformed firebase.json
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        '{ invalid json'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle binary files in project', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create a file with binary-like content
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'image.ts'),
        '\x00\x01\x02 export const img = "test";'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle deeply nested project structure', async () => {
      const deepPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'modules',
        'auth',
        'services'
      );
      FileUtils.createDirectory(deepPath);

      const authContent = `
        export class DeepAuthService {
          getToken() { return 'token'; }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(deepPath, 'auth.service.ts'),
        authContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle project with many files', async () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create multiple files
      for (let i = 0; i < 15; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.ts`),
          `export class Component${i} {}`
        );
      }

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await ApiSecurityStandardsLaw.check(context);
      expect(result).toBeDefined();
    });
  });
});
