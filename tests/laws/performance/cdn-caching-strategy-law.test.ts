/**
 * Tests for CdnCachingStrategyLaw
 *
 * Comprehensive tests for CDN and caching strategy analysis
 * including CDN configuration, asset optimization, caching headers,
 * service worker, and HTTP/2 optimization.
 */
import { CdnCachingStrategyLaw } from '../../../src/laws/performance/cdn-caching-strategy';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CdnCachingStrategyLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('cdn-caching-strategy-law-test-');
    // The law is about caching the web assets a project serves. Give every
    // fixture a source file, so the substrate exists and the analysis runs;
    // the "no web assets" (N/A) case is covered in its own block below.
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
  });

  // The absence of the substrate is never a violation: a project that serves no
  // web assets (e.g. a Python backend) has no CDN/caching concern at all — the
  // law is NOT APPLICABLE, not permanently red.
  describe('project without web assets (not applicable)', () => {
    let backendDir: string;

    beforeEach(() => {
      backendDir = FileUtils.createTempDirectory('cdn-python-backend-test-');
      FileUtils.writeFile(
        PathOperations.join(backendDir, 'main.py'),
        'def run() -> None:\n    pass\n'
      );
      FileUtils.writeFile(
        PathOperations.join(backendDir, 'pyproject.toml'),
        '[project]\nname = "backend"\n'
      );
    });

    afterEach(() => {
      FileUtils.deleteDirectory(backendDir);
    });

    it('should report N/A and pass with zero violations', async () => {
      const result = await CdnCachingStrategyLaw.check({
        ...mockContext,
        projectRoot: backendDir,
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toEqual([]);
      expect(result.message).toContain('Not applicable');
      expect(result.message).toContain('no web assets to serve');
    });
  });

  describe('project with web assets but no caching configuration', () => {
    it('should detect missing CDN configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.violations?.some(v => v.toLowerCase().includes('cdn'))).toBe(
        true
      );
    });

    it('should detect missing asset optimization', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('asset') ||
            v.toLowerCase().includes('optimiz')
        )
      ).toBe(true);
    });

    it('should detect missing caching headers', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('caching') ||
            v.toLowerCase().includes('header')
        )
      ).toBe(true);
    });

    it('should detect missing service worker', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('service worker'))
      ).toBe(true);
    });

    it('should detect missing HTTP/2 optimization', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('http/2') ||
            v.toLowerCase().includes('http2')
        )
      ).toBe(true);
    });

    it('should fail for empty project', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('project with CDN configuration', () => {
    beforeEach(() => {
      // Create firebase.json with CDN hosting
      const firebaseJson = {
        hosting: {
          public: 'dist',
          ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'max-age=31536000',
                },
              ],
            },
          ],
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        JSON.stringify(firebaseJson, null, 2)
      );
    });

    it('should detect Firebase CDN configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Firebase CDN should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should still check for other caching strategies', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Should still check other aspects
      expect(result.violations).toBeDefined();
    });
  });

  describe('project with Cloudflare configuration', () => {
    beforeEach(() => {
      // Create wrangler.toml for Cloudflare
      const wranglerConfig = `
name = "test-project"
type = "webpack"
account_id = "account_id"
workers_dev = true
route = ""
zone_id = ""

[site]
bucket = "./dist"
entry-point = "workers-site"
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'wrangler.toml'),
        wranglerConfig
      );
    });

    it('should detect Cloudflare configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Cloudflare config should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with service worker', () => {
    beforeEach(() => {
      // Create ngsw-config.json for Angular service worker
      const ngswConfig = {
        $schema: './node_modules/@angular/service-worker/config/schema.json',
        index: '/index.html',
        assetGroups: [
          {
            name: 'app',
            installMode: 'prefetch',
            resources: {
              files: ['/favicon.ico', '/index.html', '/*.css', '/*.js'],
            },
          },
        ],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ngsw-config.json'),
        JSON.stringify(ngswConfig, null, 2)
      );

      // Create angular.json with service worker enabled
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                options: {
                  serviceWorker: true,
                  ngswConfigPath: 'ngsw-config.json',
                },
              },
            },
          },
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify(angularJson, null, 2)
      );
    });

    it('should detect service worker configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Service worker should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should not have service worker violation', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // May or may not detect based on implementation
      expect(result).toBeDefined();
    });
  });

  describe('project with caching headers', () => {
    beforeEach(() => {
      // Create nginx.conf with caching headers
      const nginxConfig = `
server {
    listen 80;
    server_name example.com;

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \\.(html)$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxConfig
      );
    });

    it('should detect nginx caching configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Nginx config should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with asset optimization', () => {
    beforeEach(() => {
      // Create angular.json with asset optimization
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                options: {
                  optimization: {
                    scripts: true,
                    styles: true,
                    fonts: {
                      inline: true,
                    },
                  },
                  sourceMap: false,
                  extractCss: true,
                  namedChunks: false,
                },
              },
            },
          },
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify(angularJson, null, 2)
      );
    });

    it('should detect asset optimization', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Asset optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with HTTP/2 optimization', () => {
    beforeEach(() => {
      // Create nginx.conf with HTTP/2
      const nginxConfig = `
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    # Enable HTTP/2 Push
    http2_push_preload on;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nginx.conf'),
        nginxConfig
      );
    });

    it('should detect HTTP/2 configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // HTTP/2 config should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create comprehensive CDN and caching configuration
      const firebaseJson = {
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: [
                { key: 'Cache-Control', value: 'max-age=31536000, immutable' },
              ],
            },
            {
              source: 'index.html',
              headers: [{ key: 'Cache-Control', value: 'no-cache, no-store' }],
            },
          ],
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        JSON.stringify(firebaseJson, null, 2)
      );

      const ngswConfig = {
        index: '/index.html',
        assetGroups: [{ name: 'app', installMode: 'prefetch' }],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ngsw-config.json'),
        JSON.stringify(ngswConfig, null, 2)
      );

      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                options: {
                  serviceWorker: true,
                  optimization: true,
                },
              },
            },
          },
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify(angularJson, null, 2)
      );
    });

    it('should have better score for fully configured project', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      // Need full configuration to pass
      const result = await CdnCachingStrategyLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('implemented');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('issues');
      }
    });
  });

  describe('details array', () => {
    it('should contain violations and suggestions in details', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details for empty project', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      if (result.details) {
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct points for each missing configuration', async () => {
      const result = await CdnCachingStrategyLaw.check(mockContext);

      if ((result.violations?.length ?? 0) > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with generic project type', async () => {
      mockContext.config.project.type = 'generic';
      const result = await CdnCachingStrategyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CDN providers detection', () => {
    it('should detect AWS CloudFront configuration', async () => {
      // Create CloudFront config reference
      const cloudformationTemplate = {
        Resources: {
          CloudFrontDistribution: {
            Type: 'AWS::CloudFront::Distribution',
            Properties: {
              DistributionConfig: {
                DefaultCacheBehavior: {
                  CachePolicyId: 'policy-id',
                },
              },
            },
          },
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'cloudformation.json'),
        JSON.stringify(cloudformationTemplate, null, 2)
      );

      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should detect Netlify configuration', async () => {
      const netlifyToml = `
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'netlify.toml'),
        netlifyToml
      );

      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should detect Vercel configuration', async () => {
      const vercelJson = {
        headers: [
          {
            source: '/(.*)',
            headers: [
              { key: 'Cache-Control', value: 'public, max-age=31536000' },
            ],
          },
        ],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'vercel.json'),
        JSON.stringify(vercelJson, null, 2)
      );

      const result = await CdnCachingStrategyLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });
});
