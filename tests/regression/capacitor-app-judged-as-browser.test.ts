/**
 * #253: two existing laws judged a Capacitor app as a browser.
 *
 * The caching analyzer exempts a Capacitor app from the service-worker
 * requirement — rightly — but recognised one only by a substring of the ROOT
 * package.json, so a monorepo whose app declares @capacitor/core in its own
 * manifest was told it had no caching strategy. It now asks the same reader
 * `requires` asks (every workspace manifest).
 *
 * Web Storage Encapsulation keeps its detector; its card now carries the
 * Capacitor guidance and the limit that the backing store is not judged.
 */
import { CachingStrategyAnalyzer } from '../../src/laws/performance/performance-standards/services/caching-strategy.analyzer';
import { CODE_QUALITY_LAWS } from '../../src/data/code-quality-laws';
import { PERFORMANCE_LAWS } from '../../src/data/performance-laws';
import { manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const NO_STRATEGY = 'Browser caching strategy not implemented';

describe('caching analyzer: the Capacitor exemption reads every workspace manifest (#253)', () => {
  it('exempts a workspace app that declares @capacitor/core in its own package.json', async () => {
    const root = project({
      'package.json': manifest({ nx: '21.0.0' }),
      'apps/mobile/package.json': manifest({ '@capacitor/core': '8.5.1' }),
      'apps/mobile/capacitor.config.ts': 'export default {};',
    });
    expect(await CachingStrategyAnalyzer.analyze(root)).toEqual([]);
  });

  it('control: a web project without Capacitor and without a strategy is still told so', async () => {
    const root = project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) });
    expect(await CachingStrategyAnalyzer.analyze(root)).toEqual([NO_STRATEGY]);
  });

  it('control: a mention of @capacitor/core that is not a dependency is not Capacitor', async () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'web', scripts: { note: 'echo @capacitor/core is not used here' } }),
    });
    expect(await CachingStrategyAnalyzer.analyze(root)).toEqual([NO_STRATEGY]);
  });
});

describe('cards carry the Capacitor reading (#253)', () => {
  const card = (laws: typeof CODE_QUALITY_LAWS, title: string) => laws.find(law => law.title === title)!;

  it('Web Storage Encapsulation: satisfiedBy.capacitor and a limit naming the backing-store question', () => {
    const law = card(CODE_QUALITY_LAWS, 'Web Storage Encapsulation');
    expect(law.satisfiedBy?.capacitor).toMatch(/@capacitor\/preferences/);
    expect(law.detectionLimits?.join(' ')).toMatch(/transient.*#269/);
  });

  it('Performance Standards: satisfiedBy.capacitor and a limit naming a service worker in the native WebView', () => {
    const law = card(PERFORMANCE_LAWS, 'Performance Standards');
    expect(law.satisfiedBy?.capacitor).toMatch(/service worker/);
    expect(law.detectionLimits?.join(' ')).toMatch(/native WebView.*#268/);
  });
});
