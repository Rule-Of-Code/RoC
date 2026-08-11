import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AssetOptimizationAnalyzerService } from '../../src/laws/performance/cdn-caching-strategy/services/asset-optimization.analyzer';
import { Http2OptimizationAnalyzerService } from '../../src/laws/performance/cdn-caching-strategy/services/http2-optimization.analyzer';
import { BrowserCachingAnalyzerService } from '../../src/laws/performance/core-web-vitals-compliance/services/browser-caching.analyzer';

/**
 * The performance analyzers assumed one workspace layout and one hosting
 * vendor: build configuration in a root `angular.json`, a service worker
 * config at the repository root, a manifest named `manifest.json`, and caching
 * headers only ever in `nginx.conf`.
 *
 * None of those hold for an Nx workspace on a static host — which is a
 * mainstream way to ship an Angular app, not an exotic one.
 */
describe('performance discovery across workspace layouts and hosts', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /** An Nx classic workspace: no root angular.json, config per project.json. */
  const nxWorkspace = (production: Record<string, unknown>): void => {
    write('package.json', JSON.stringify({ name: 'w' }));
    write('nx.json', '{}');
    write(
      'apps/web/project.json',
      JSON.stringify({
        name: 'web',
        targets: { build: { configurations: { production } } },
      })
    );
  };

  const firebaseWith = (headers: unknown): void =>
    write(
      'firebase.json',
      JSON.stringify({ hosting: { public: 'dist', headers } })
    );

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-perfdisc-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('build configuration lives in project.json when there is no angular.json', () => {
    it('reads an optimised production build from project.json', () => {
      nxWorkspace({ optimization: true, outputHashing: 'all' });

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        true
      );
    });

    it('reads namedChunks from project.json', () => {
      nxWorkspace({ optimization: true, namedChunks: true });

      expect(Http2OptimizationAnalyzerService.analyze(root).optimized).toBe(
        true
      );
    });

    it('still reports a build that is not optimised', () => {
      nxWorkspace({ optimization: false });

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        false
      );
    });

    it('still reads a root angular.json when there is one', () => {
      write('package.json', JSON.stringify({ name: 'w' }));
      write(
        'angular.json',
        JSON.stringify({
          projects: {
            web: {
              architect: {
                build: {
                  configurations: {
                    production: { optimization: true, outputHashing: 'all' },
                  },
                },
              },
            },
          },
        })
      );

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        true
      );
    });
  });

  describe('service worker and manifest are found beside the app', () => {
    it('finds ngsw-config.json under a monorepo app', () => {
      nxWorkspace({ optimization: true });
      write('apps/web/ngsw-config.json', '{"index":"/index.html"}');

      expect(
        BrowserCachingAnalyzerService.analyze(root).strategies
      ).toContain('Service Worker detected');
    });

    it('finds a .webmanifest, the extension the Angular generator scaffolds', () => {
      nxWorkspace({ optimization: true });
      write('apps/web/public/manifest.webmanifest', '{"name":"app"}');

      expect(BrowserCachingAnalyzerService.analyze(root).strategies).toContain(
        'PWA manifest found'
      );
    });

    it('reports no strategy when the project has neither', () => {
      nxWorkspace({ optimization: true });

      expect(BrowserCachingAnalyzerService.analyze(root).hasStrategy).toBe(
        false
      );
    });
  });

  describe('caching headers are read from the host that is actually used', () => {
    it('reads Cache-Control from a static-host config, not only nginx', () => {
      nxWorkspace({ optimization: true });
      firebaseWith([
        {
          source: '**/*.@(js|css)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ]);

      expect(BrowserCachingAnalyzerService.analyze(root).strategies).toContain(
        'HTTP caching headers configured'
      );
    });

    it('still reports a host config with no caching header', () => {
      nxWorkspace({ optimization: true });
      firebaseWith([
        { source: '**', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      ]);

      expect(BrowserCachingAnalyzerService.analyze(root).hasStrategy).toBe(
        false
      );
    });

    it('reads nginx.conf as before', () => {
      nxWorkspace({ optimization: true });
      write('nginx.conf', 'location / { add_header Cache-Control "max-age=60"; }');

      expect(BrowserCachingAnalyzerService.analyze(root).strategies).toContain(
        'HTTP caching headers configured'
      );
    });
  });
});
