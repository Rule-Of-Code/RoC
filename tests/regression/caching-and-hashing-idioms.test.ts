import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AssetOptimizationAnalyzerService } from '../../src/laws/performance/cdn-caching-strategy/services/asset-optimization.analyzer';
import { BrowserCachingAnalyzerService } from '../../src/laws/performance/core-web-vitals-compliance/services/browser-caching.analyzer';
import { CachingStrategyAnalyzer } from '../../src/laws/performance/performance-standards/services/caching-strategy.analyzer';

/**
 * The same family as #95: a concern that is met, reported as absent because it
 * is expressed in the framework's idiom rather than webpack's.
 *
 * One of the two was a direct disagreement inside a single audit run — one law
 * confirming the caching strategy while another reported it missing.
 */
describe('caching and hashing are read in every idiom', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /** A prerendered site on static hosting with immutable caching headers. */
  const staticHostWithHeaders = (): void => {
    write('package.json', '{"name":"site","version":"1.0.0"}');
    write(
      'firebase.json',
      JSON.stringify({
        hosting: {
          public: 'dist/apps/web/browser',
          headers: [
            {
              source: '**/*.@(js|css|woff2)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ],
        },
      })
    );
  };

  /** An Nx workspace that content-hashes every asset it ships. */
  const nxWithOutputHashing = (hashing = 'all'): void => {
    write('package.json', '{"name":"w","version":"1.0.0"}');
    write('nx.json', '{}');
    write(
      'apps/web/project.json',
      JSON.stringify({
        name: 'web',
        targets: {
          build: {
            executor: '@angular/build:application',
            configurations: { production: { outputHashing: hashing } },
          },
        },
      })
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cache-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * One repository, one answer. Two analyzers reading the same concern must
   * not disagree — that was the shape 7.20.0 fixed for the branch-name laws.
   */
  describe('the two caching analyzers agree', () => {
    it('both accept HTTP caching headers on a static host', async () => {
      staticHostWithHeaders();

      expect(BrowserCachingAnalyzerService.analyze(root).hasStrategy).toBe(true);
      expect(await CachingStrategyAnalyzer.analyze(root)).toEqual([]);
    });

    // The red control: neither strategy present is still a finding.
    it('both report a project with no caching strategy at all', async () => {
      write('package.json', '{"name":"site","version":"1.0.0"}');

      expect(BrowserCachingAnalyzerService.analyze(root).hasStrategy).toBe(
        false
      );
      expect((await CachingStrategyAnalyzer.analyze(root)).length).toBeGreaterThan(
        0
      );
    });
  });

  /**
   * `contenthash` appears nowhere in an Angular project. Reading only webpack's
   * vocabulary made this finding unreachable for that whole ecosystem — and it
   * is the check that matters most for the one above, since an immutable
   * `Cache-Control` is only safe BECAUSE the filenames are hashed.
   */
  describe('asset hashing is read in the build configuration', () => {
    it.each([['all'], ['media'], ['bundles']])(
      'accepts outputHashing: %s in an Nx target',
      hashing => {
        nxWithOutputHashing(hashing);

        expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
          true
        );
      }
    );

    it('accepts a root angular.json declaring it', () => {
      write('package.json', '{"name":"app","version":"1.0.0"}');
      write(
        'angular.json',
        JSON.stringify({
          projects: {
            app: {
              architect: {
                build: { configurations: { production: { outputHashing: 'all' } } },
              },
            },
          },
        })
      );

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        true
      );
    });

    it('still accepts a webpack project that says contenthash', () => {
      write('package.json', '{"name":"app","version":"1.0.0"}');
      write(
        'webpack.config.js',
        "module.exports = { output: { filename: '[name].[contenthash].js' } };"
      );

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        true
      );
    });

    // The red controls.
    it('reports a workspace that declares no hashing', () => {
      write('package.json', '{"name":"w","version":"1.0.0"}');
      write('nx.json', '{}');
      write(
        'apps/web/project.json',
        JSON.stringify({ name: 'web', targets: { build: { options: {} } } })
      );

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        false
      );
    });

    it('does not accept an explicit refusal', () => {
      nxWithOutputHashing('none');

      expect(AssetOptimizationAnalyzerService.analyze(root).optimized).toBe(
        false
      );
    });
  });
});