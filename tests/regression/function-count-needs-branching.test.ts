import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * The function ceiling was governed by `maxComplexity` — a key that reads as
 * cyclomatic complexity, which this same law computes two checks away — and it
 * fired on the count alone.
 *
 * Angular's lazy-route API costs two functions per route: an arrow to defer the
 * import and an arrow to pick the export. Eleven routes reach 22 functions with
 * TWO decision points and nothing to reason about. That file crossed a
 * *complexity* ceiling by being maximally declarative, and the only ways to
 * comply were to split a routing table across files or raise the limit for
 * every file in the repository.
 */
describe('the function ceiling asks whether the file also branches', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const countFindings = (config?: RuleOfCodeConfig): string[] => {
    const result = CodeComplexityControlLaw.check({
      projectRoot: root,
      config: config ?? FileUtils.getMinimalDefaultConfig(),
      lawId: 'code-complexity-control',
    });
    return (result.violations ?? []).filter(v => /Too many functions/.test(v));
  };

  /** A routing table: two arrows per route, no branching. */
  const routingTable = (routes: number): string => {
    const entries = Array.from(
      { length: routes },
      (_, i) =>
        `  { path: 'p${i}', loadComponent: () => import('./c${i}').then(m => m.C${i}) },`
    ).join('\n');
    return `export const routes = [\n${entries}\n];\n`;
  };

  /** The same number of functions, each one branching. */
  const branchingCallbacks = (count: number): string => {
    const fns = Array.from(
      { length: count },
      (_, i) =>
        `export const f${i} = (a: number) => { if (a > ${i}) { return a; } else if (a < 0) { return 0; } return -a; };`
    ).join('\n');
    return fns + '\n';
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cx-'));
    write('package.json', '{"name":"w","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('says nothing about a declarative routing table', () => {
    write('src/app.routes.ts', routingTable(12));

    expect(countFindings()).toEqual([]);
  });

  it('says nothing about a provider array of small lambdas', () => {
    const providers = Array.from(
      { length: 24 },
      (_, i) => `  { provide: T${i}, useFactory: () => new S${i}() },`
    ).join('\n');
    write('src/providers.ts', `export const providers = [\n${providers}\n];\n`);

    expect(countFindings()).toEqual([]);
  });

  /** The red control: many functions that each branch is the real target. */
  it('still reports many functions that branch', () => {
    write('src/handlers.ts', branchingCallbacks(24));

    expect(countFindings().length).toBeGreaterThan(0);
  });

  it('names the decision count in the finding, not just the function count', () => {
    write('src/handlers.ts', branchingCallbacks(24));

    expect(countFindings()[0]).toMatch(/decision points/);
  });

  describe('the threshold has a name that says what it counts', () => {
    const withThresholds = (
      codeQuality: Record<string, number>
    ): RuleOfCodeConfig => {
      const config = FileUtils.getMinimalDefaultConfig();
      config.thresholds = { ...config.thresholds, codeQuality };
      return config;
    };

    it('honours maxFunctionsPerFile', () => {
      write('src/handlers.ts', branchingCallbacks(24));

      expect(countFindings(withThresholds({ maxFunctionsPerFile: 100 }))).toEqual(
        []
      );
    });

    /** A config written before the two were separated keeps its meaning. */
    it('still honours maxComplexity as the fallback', () => {
      write('src/handlers.ts', branchingCallbacks(24));

      expect(countFindings(withThresholds({ maxComplexity: 100 }))).toEqual([]);
    });

    it('prefers the explicit name when both are set', () => {
      write('src/handlers.ts', branchingCallbacks(24));

      expect(
        countFindings(
          withThresholds({ maxFunctionsPerFile: 100, maxComplexity: 2 })
        )
      ).toEqual([]);
    });
  });
});
