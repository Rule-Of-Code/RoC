import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { LighthouseAnalyzer } from '../../src/laws/performance/performance-standards/services/lighthouse.analyzer';
import { LighthouseAnalyzerService } from '../../src/laws/performance/core-web-vitals-compliance/services/lighthouse.analyzer';
import { inspectLighthouseGate } from '../../src/utils/lighthouse-gate';

/**
 * An eighteen-byte file that nothing executes turned a law from a violation
 * into a pass:
 *
 *     echo '{"performance":1}' > .lighthouserc.json
 *
 * Core Web Vitals Compliance went from 75/100 with a violation to 100/100
 * PASSED. No Lighthouse installed, no script referencing the file, the shipped
 * artefact byte-identical.
 *
 * This tool ships a documented list of ways to disarm it — pareto mode in a
 * gate, fast mode in a hook, a low floor, wide ignores, an unjustified waiver,
 * `--no-verify`. Every one is a deliberate act a reader can see in the config.
 * This was the same power in one `echo`, appearing nowhere as a decision, and
 * it moved a law the wrong way: towards green.
 */
describe('a Lighthouse gate is something that runs', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const REAL_CONFIG = JSON.stringify({
    ci: {
      assert: {
        assertions: { 'categories:performance': ['error', { minScore: 0.9 }] },
      },
    },
  });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-lh-'));
    write('package.json', '{"name":"site","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('a file alone does not satisfy it', () => {
    it('the reported eighteen bytes do not turn the law green', () => {
      write('.lighthouserc.json', '{"performance":1}');

      expect(LighthouseAnalyzerService.analyze(root).hasConfig).toBe(false);
      expect(LighthouseAnalyzer.analyze(root)).toEqual([
        'Lighthouse configuration exists but nothing runs it — add a script, a CI step, or the dependency, or the file gates nothing',
      ]);
    });

    it('says something different when there is no config at all', () => {
      expect(LighthouseAnalyzer.analyze(root)).toEqual([
        'Lighthouse performance configuration not found',
      ]);
    });

    /**
     * `90` as a bare substring matched a port, a width or a percentage. The
     * threshold clause was named after something it never checked.
     */
    it('a stray 90 in an unrelated file is not a threshold', () => {
      write('package.json', '{"name":"site","scripts":{"start":"serve -p 9000"}}');
      write('.lighthouserc.json', '{"port":9000,"width":390}');

      expect(inspectLighthouseGate(root).declaresThreshold).toBe(false);
    });
  });

  describe('wiring is what satisfies it', () => {
    it.each([
      [
        { 'package.json': '{"name":"s","scripts":{"perf":"lhci autorun"}}' },
        'a package script',
      ],
      [
        { 'package.json': '{"name":"s","devDependencies":{"@lhci/cli":"^0.13.0"}}' },
        'a declared dependency',
      ],
      [
        {
          'package.json': '{"name":"s"}',
          '.github/workflows/ci.yml': 'jobs:\n  perf:\n    steps:\n      - run: lhci autorun\n',
        },
        'a CI step',
      ],
    ])('accepts %j — %s', (files, _label) => {
      for (const [rel, content] of Object.entries(
        files as Record<string, string>
      )) {
        write(rel, content);
      }
      write('.lighthouserc.json', REAL_CONFIG);

      expect(LighthouseAnalyzerService.analyze(root).hasConfig).toBe(true);
      expect(LighthouseAnalyzer.analyze(root)).toEqual([]);
    });

    it('names where the wiring was found', () => {
      write('package.json', '{"name":"s","scripts":{"perf":"lhci autorun"}}');
      write('.lighthouserc.json', REAL_CONFIG);

      expect(inspectLighthouseGate(root).evidence).toContain(
        'a package script runs it'
      );
    });
  });

  /** Wired but without a declared threshold is still a finding. */
  it('reports a wired gate whose config declares no threshold', () => {
    write('package.json', '{"name":"s","scripts":{"perf":"lhci autorun"}}');
    write('.lighthouserc.json', '{"ci":{}}');

    expect(LighthouseAnalyzer.analyze(root)).toEqual([
      'Lighthouse configuration missing performance threshold ≥90',
    ]);
  });

  /** The two laws must not disagree about the same repository. */
  it('both laws agree on a wired project and on a bare file', () => {
    write('.lighthouserc.json', '{"performance":1}');
    expect(LighthouseAnalyzerService.analyze(root).hasConfig).toBe(false);
    expect(LighthouseAnalyzer.analyze(root).length).toBeGreaterThan(0);

    write('package.json', '{"name":"s","scripts":{"perf":"lhci autorun"}}');
    write('.lighthouserc.json', REAL_CONFIG);
    expect(LighthouseAnalyzerService.analyze(root).hasConfig).toBe(true);
    expect(LighthouseAnalyzer.analyze(root)).toEqual([]);
  });
});