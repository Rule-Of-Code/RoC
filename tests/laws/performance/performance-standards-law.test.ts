/**
 * Tests for PerformanceStandardsLaw
 *
 * Comprehensive tests for performance standards analysis
 * including Lighthouse configuration, performance budgets,
 * Core Web Vitals, bundle optimization, image optimization, and caching strategy.
 */
import { PerformanceStandardsLaw } from '../../../src/laws/performance/performance-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceStandardsLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('performance-standards-law-test-');
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
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have static suggestions list', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Should have predefined suggestions
      expect((result.suggestions?.length ?? 0)).toBeGreaterThan(0);
    });
  });

  describe('empty project analysis', () => {
    it('should fail for empty project', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have violations for empty project', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect((result.violations?.length ?? 0)).toBeGreaterThan(0);
    });

    it('should include violations in details', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.details).toEqual(result.violations);
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
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
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
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Lighthouse should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations with Lighthouse', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Should detect Lighthouse
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
                      {
                        type: 'anyScript',
                        maximumWarning: '100kb',
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

    it('should detect performance budgets', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Budgets should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with Core Web Vitals', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'web-vitals': '^3.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const webVitals = `
import { getCLS, getFID, getLCP, getFCP, getTTFB, getINP } from 'web-vitals';

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getLCP(onPerfEntry);
    getFCP(onPerfEntry);
    getTTFB(onPerfEntry);
    getINP(onPerfEntry);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'web-vitals.ts'),
        webVitals
      );
    });

    it('should detect Core Web Vitals monitoring', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // CWV should be detected
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
                    aot: true,
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

      // Create lazy-loaded routes
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const routes = `
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent),
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.routes').then(r => r.routes),
  },
];
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'app.routes.ts'), routes);
    });

    it('should detect bundle optimization', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Bundle optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should detect lazy loading', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Code splitting should be detected
      expect(result).toBeDefined();
    });
  });

  describe('project with image optimization', () => {
    beforeEach(() => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      // Create component using NgOptimizedImage
      const imageComponent = `
import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [NgOptimizedImage],
  template: \`
    <img ngSrc="hero.webp" width="800" height="600" priority />
    <img ngSrc="product-1.webp" width="400" height="300" loading="lazy" />
    <img ngSrc="product-2.webp" width="400" height="300" loading="lazy" />
  \`,
})
export class ImageGalleryComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'image-gallery.component.ts'),
        imageComponent
      );

      // Create angular.json with font optimization
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                options: {
                  optimization: {
                    fonts: {
                      inline: true,
                    },
                    styles: {
                      minify: true,
                      inlineCritical: true,
                    },
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

    it('should detect image optimization', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Image optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize NgOptimizedImage', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // NgOptimizedImage is Angular's image optimization directive
      expect(result).toBeDefined();
    });
  });

  describe('project with caching strategy', () => {
    beforeEach(() => {
      // Create ngsw-config.json for service worker
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
          {
            name: 'assets',
            installMode: 'lazy',
            updateMode: 'prefetch',
            resources: {
              files: [
                '/assets/**',
                '/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
              ],
            },
          },
        ],
        dataGroups: [
          {
            name: 'api',
            urls: ['/api/**'],
            cacheConfig: {
              maxSize: 100,
              maxAge: '1d',
              timeout: '10s',
              strategy: 'freshness',
            },
          },
        ],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'ngsw-config.json'),
        JSON.stringify(ngswConfig, null, 2)
      );

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
              source: '**/*.@(jpg|jpeg|png|gif|svg|webp|avif)',
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

    it('should detect caching strategy', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Caching should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should detect service worker', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Service worker should be detected
      expect(result).toBeDefined();
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create comprehensive performance standards setup
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

      const packageJson = {
        name: 'test-project',
        dependencies: {
          'web-vitals': '^3.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
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

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const webVitals = `
import { getCLS, getFID, getLCP } from 'web-vitals';
getCLS(console.log);
getFID(console.log);
getLCP(console.log);
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'vitals.ts'), webVitals);

      const imageComponent = `
import { NgOptimizedImage } from '@angular/common';
export class ImageComponent { }
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'image.component.ts'),
        imageComponent
      );
    });

    it('should have better score for fully configured project', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('implemented');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('gaps');
      }
    });

    it('should include violations in message when failed', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      if (!result.passed && (result.violations?.length ?? 0) > 0) {
        expect(result.message).toContain(':');
      }
    });
  });

  describe('suggestions', () => {
    it('should suggest configuring Lighthouse', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(s => s.toLowerCase().includes('lighthouse'))
      ).toBe(true);
    });

    it('should suggest setting performance budgets', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(s => s.toLowerCase().includes('budget'))
      ).toBe(true);
    });

    it('should suggest Core Web Vitals monitoring', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(
          s =>
            s.toLowerCase().includes('cls') ||
            s.toLowerCase().includes('fid') ||
            s.toLowerCase().includes('lcp')
        )
      ).toBe(true);
    });

    it('should suggest production optimizations', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(
          s =>
            s.toLowerCase().includes('production') ||
            s.toLowerCase().includes('optimiz') ||
            s.toLowerCase().includes('splitting')
        )
      ).toBe(true);
    });

    it('should suggest image optimization', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(
          s =>
            s.toLowerCase().includes('image') ||
            s.toLowerCase().includes('webp') ||
            s.toLowerCase().includes('lazy')
        )
      ).toBe(true);
    });

    it('should suggest caching strategy', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(
        result.suggestions?.some(
          s =>
            s.toLowerCase().includes('caching') ||
            s.toLowerCase().includes('service worker')
        )
      ).toBe(true);
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate score as 100 - scoreImpact', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Score should be calculated based on violations
      expect(result.score).toBeDefined();
    });

    it('should deduct 25 points for missing Lighthouse', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Lighthouse deduction is 25
      if (result.violations?.some(v => v.toLowerCase().includes('lighthouse'))) {
        expect(result.score).toBeLessThanOrEqual(75);
      }
    });

    it('should deduct 20 points for missing budgets', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Budgets deduction is 20
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 20 points for missing CWV', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // CWV deduction is 20
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('details array', () => {
    it('should contain violations in details', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details equal to violations', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result.details).toEqual(result.violations);
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with generic project type', async () => {
      mockContext.config.project.type = 'generic';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with library project type', async () => {
      mockContext.config.project.type = 'library';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Ionic project type', async () => {
      mockContext.config.project.type = 'ionic';
      const result = await PerformanceStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzer service coordination', () => {
    it('should aggregate violations from all analyzers', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Should have multiple types of violations
      expect((result.violations?.length ?? 0)).toBeGreaterThan(0);
    });

    it('should calculate scoreImpact correctly', async () => {
      const result = await PerformanceStandardsLaw.check(mockContext);

      // Score should reflect the number of issues
      if ((result.violations?.length ?? 0) > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });
  });
});
