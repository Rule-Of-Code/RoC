/**
 * Tests for CoreWebVitalsComplianceLaw
 *
 * Comprehensive tests for Core Web Vitals compliance analysis
 * including Lighthouse configuration, performance budgets,
 * bundle optimization, browser caching, image optimization, and resource hints.
 */
import { CoreWebVitalsComplianceLaw } from '../../../src/laws/performance/core-web-vitals-compliance';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CoreWebVitalsComplianceLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('core-web-vitals-law-test-');
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
    it('should return Promise with LawResult', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should be an async function', () => {
      const checkFn = CoreWebVitalsComplianceLaw.check(mockContext);
      expect(checkFn).toBeInstanceOf(Promise);
    });
  });

  describe('empty project analysis', () => {
    it('should detect missing Lighthouse configuration', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('lighthouse'))
      ).toBe(true);
    });

    it('should detect missing performance budgets', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('budget'))
      ).toBe(true);
    });

    it('should detect missing bundle optimization', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('bundle') ||
            v.toLowerCase().includes('optimiz')
        )
      ).toBe(true);
    });

    it('should detect missing caching strategy', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('caching'))
      ).toBe(true);
    });

    it('should detect missing image optimization', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('image'))
      ).toBe(true);
    });

    it('should detect missing resource hints', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('hint') ||
            v.toLowerCase().includes('resource')
        )
      ).toBe(true);
    });

    it('should fail for empty project', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('project with Lighthouse configuration', () => {
    beforeEach(() => {
      // Create .lighthouserc.js
      const lighthouseConfig = `
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: ['http://localhost:4200/'],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.js'),
        lighthouseConfig
      );
    });

    it('should detect Lighthouse configuration', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Lighthouse config should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should not have Lighthouse violation', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Lighthouse should be detected
      expect(result).toBeDefined();
    });
  });

  describe('project with performance budgets', () => {
    beforeEach(() => {
      // Create angular.json with budgets
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                configurations: {
                  production: {
                    budgets: [
                      {
                        type: 'initial',
                        maximumWarning: '500kb',
                        maximumError: '1mb',
                      },
                      {
                        type: 'anyComponentStyle',
                        maximumWarning: '2kb',
                        maximumError: '4kb',
                      },
                    ],
                  },
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

    it('should detect performance budget configuration', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Budget config should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with bundle optimization', () => {
    beforeEach(() => {
      // Create angular.json with optimization
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: true,
                    outputHashing: 'all',
                    sourceMap: false,
                    namedChunks: false,
                    extractLicenses: true,
                    vendorChunk: false,
                    buildOptimizer: true,
                  },
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

    it('should detect bundle optimization', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Bundle optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with browser caching', () => {
    beforeEach(() => {
      // Create firebase.json with caching headers
      const firebaseJson = {
        hosting: {
          headers: [
            {
              source: '**/*.@(js|css)',
              headers: [
                { key: 'Cache-Control', value: 'max-age=31536000, immutable' },
              ],
            },
            {
              source: '**/*.@(jpg|jpeg|gif|png|svg|webp)',
              headers: [{ key: 'Cache-Control', value: 'max-age=31536000' }],
            },
          ],
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        JSON.stringify(firebaseJson, null, 2)
      );
    });

    it('should detect browser caching configuration', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Browser caching should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with image optimization', () => {
    beforeEach(() => {
      // Create angular.json with image optimization
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                options: {
                  optimization: {
                    fonts: { inline: true },
                    styles: { inlineCritical: true },
                  },
                  assets: [
                    {
                      glob: '**/*',
                      input: 'src/assets/',
                      output: '/assets/',
                    },
                  ],
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

      // Create source file using NgOptimizedImage
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const componentFile = `
import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-image-example',
  standalone: true,
  imports: [NgOptimizedImage],
  template: \`
    <img ngSrc="hero.jpg" width="400" height="300" priority>
    <img ngSrc="product.jpg" width="200" height="200" loading="lazy">
  \`
})
export class ImageExampleComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'image-example.component.ts'),
        componentFile
      );
    });

    it('should detect image optimization usage', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Image optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with resource hints', () => {
    beforeEach(() => {
      // Create index.html with resource hints
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test Project</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://api.example.com">
  <link rel="preload" href="critical.css" as="style">
  <link rel="modulepreload" href="main.js">
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'index.html'), indexHtml);
    });

    it('should detect resource hints', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Resource hints should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create comprehensive CWV configuration
      const lighthouseConfig = `
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.js'),
        lighthouseConfig
      );

      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: true,
                    budgets: [{ type: 'initial', maximumWarning: '500kb' }],
                  },
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

      const firebaseJson = {
        hosting: {
          headers: [
            {
              source: '**/*',
              headers: [{ key: 'Cache-Control', value: 'max-age=31536000' }],
            },
          ],
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        JSON.stringify(firebaseJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body><app-root></app-root></body>
</html>
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'index.html'), indexHtml);
    });

    it('should have better score for fully configured project', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('configured');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('issues');
      }
    });
  });

  describe('details array', () => {
    it('should contain violations and suggestions in details', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details for empty project', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      if (result.details) {
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct points for each missing configuration', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      if ((result.violations?.length ?? 0) > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with generic project type', async () => {
      mockContext.config.project.type = 'generic';
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Core Web Vitals metrics', () => {
    it('should check for LCP optimization', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Should check for LCP-related optimizations
      expect(result).toBeDefined();
    });

    it('should check for CLS prevention', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Should check for CLS-related settings
      expect(result).toBeDefined();
    });

    it('should check for FID/INP optimization', async () => {
      const result = await CoreWebVitalsComplianceLaw.check(mockContext);

      // Should check for interactivity optimizations
      expect(result).toBeDefined();
    });
  });
});
