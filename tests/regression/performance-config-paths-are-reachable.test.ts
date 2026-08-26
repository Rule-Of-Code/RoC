import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { UnitTestPerformanceTestingAnalyzerService as Analyzer } from '../../src/laws/testing/unit-test-performance-testing/services/performance-testing-analyzer.service';

/**
 * Four sub-checks looked for a config file. All four asked the same helper,
 * and that helper called `findTypeScriptFiles` — which scans `.ts` and `.tsx`.
 *
 * Not one of the names they search for is a TypeScript file:
 * `artillery.yml`, `k6.js`, `locustfile.py`, `.bundlesize.json`,
 * `.size-limit.json`, `lighthouse.json`, `.lighthouserc`, `newrelic.js`,
 * `prometheus.yaml`. The branch could never be true, so every one of the four
 * was decided entirely by a substring search in `package.json`.
 *
 * The reporter measured it the only way that settles it: adding a real
 * `.lighthouserc.json` did not move this law's finding, while it did turn a
 * different law green. One file, two laws looking for the same thing, opposite
 * outcomes.
 */
describe('the performance config-file paths are reachable', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    fs.writeFileSync(path.join(root, rel), content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-perfcfg-'));
    write('package.json', '{"name":"site","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('finds a web-vitals config — the reporter dot-file case', () => {
    write('.lighthouserc.json', '{"ci":{}}');

    expect(Analyzer.analyzeWebVitalsTesting(root).hasWebVitalsTesting).toBe(
      true
    );
  });

  it.each([['.size-limit.json'], ['.bundlesize.json']])(
    'finds a bundle-size config named %s',
    name => {
      write(name, '[]');

      expect(
        Analyzer.analyzeBundleSizeTesting(root).hasBundleSizeTesting
      ).toBe(true);
    }
  );

  it('finds a load-testing config', () => {
    write('artillery.yml', 'config: {}\n');

    expect(Analyzer.analyzeLoadTesting(root).hasLoadTesting).toBe(true);
  });

  /** A bare `.js` at the root is where these agents put their config. */
  it('finds a monitoring config named newrelic.js', () => {
    write('newrelic.js', 'module.exports = {};');

    expect(
      Analyzer.analyzePerformanceMonitoring(root).hasPerformanceMonitoring
    ).toBe(true);
  });

  /** The red control: an empty project still reports all four. */
  it('reports every concern for a project with none of them', () => {
    expect(Analyzer.analyzeWebVitalsTesting(root).hasWebVitalsTesting).toBe(
      false
    );
    expect(Analyzer.analyzeLoadTesting(root).hasLoadTesting).toBe(false);
    expect(
      Analyzer.analyzePerformanceMonitoring(root).hasPerformanceMonitoring
    ).toBe(false);
    expect(Analyzer.analyzeBundleSizeTesting(root).hasBundleSizeTesting).toBe(
      false
    );
  });

  /**
   * Bundle size was matched by four vendor names in `package.json` and nothing
   * else. Declared build budgets ARE bundle-size testing, and an enforced kind
   * — the build fails on them — and this same tool already reads them two laws
   * away in the performance family.
   */
  describe('declared build budgets count as bundle-size testing', () => {
    it('accepts Angular budgets declared in an Nx target', () => {
      fs.mkdirSync(path.join(root, 'apps', 'web'), { recursive: true });
      write('nx.json', '{}');
      fs.writeFileSync(
        path.join(root, 'apps', 'web', 'project.json'),
        JSON.stringify({
          name: 'web',
          targets: {
            build: {
              configurations: {
                production: {
                  budgets: [
                    {
                      type: 'initial',
                      maximumWarning: '500kb',
                      maximumError: '1mb',
                    },
                  ],
                },
              },
            },
          },
        })
      );

      expect(
        Analyzer.analyzeBundleSizeTesting(root).hasBundleSizeTesting
      ).toBe(true);
    });

    it('still accepts a declared vendor tool', () => {
      write(
        'package.json',
        '{"name":"s","devDependencies":{"size-limit":"^11.0.0"}}'
      );

      expect(
        Analyzer.analyzeBundleSizeTesting(root).hasBundleSizeTesting
      ).toBe(true);
    });

    it('still reports a project with neither budgets nor a tool', () => {
      write('nx.json', '{}');

      expect(
        Analyzer.analyzeBundleSizeTesting(root).hasBundleSizeTesting
      ).toBe(false);
    });
  });
});