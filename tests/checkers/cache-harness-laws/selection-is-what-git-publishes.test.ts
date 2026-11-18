/**
 * The four cache and harness laws are selected by what git publishes and
 * judge exactly those files: a git-ignored file neither selects a law nor is
 * judged by it, and `ignores.global` leaves the same files out of the gate
 * and of the law.
 */
import { AsyncCacheSingleFlightLaw } from '../../../src/checkers/cache-harness-laws/async-cache-single-flight';
import { DatabaseReadCacheSafetyLaw } from '../../../src/checkers/cache-harness-laws/database-read-cache-safety';
import { PerfHarnessMatchesProductionLaw } from '../../../src/checkers/cache-harness-laws/perf-harness-matches-production';
import { TestRigKeepsRouteGuardsLaw } from '../../../src/checkers/cache-harness-laws/test-rig-keeps-route-guards';
import { CACHE_HARNESS_LAWS } from '../../../src/data/cache-harness-laws';
import type { LawCheckContext, LawResult } from '../../../src/types/law.types';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, manifest, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

interface Case {
  law: string;
  check: (context: LawCheckContext) => LawResult;
  base: Record<string, string>;
  /** A file that selects the law and holds one finding. */
  subject: [string, string];
}

const CASES: Case[] = [
  {
    law: 'DatabaseReadCacheSafetyLaw.check',
    check: c => DatabaseReadCacheSafetyLaw.check(c),
    base: { 'requirements.txt': 'google-cloud-firestore==2.34.1\n' },
    subject: [
      'local/items.py',
      'from functools import lru_cache\n\n\n@lru_cache(maxsize=8)\ndef get_item(i):\n    return db.collection("items").document(i).get()\n',
    ],
  },
  {
    law: 'AsyncCacheSingleFlightLaw.check',
    check: c => AsyncCacheSingleFlightLaw.check(c),
    base: {},
    subject: [
      'local/profiles.py',
      '_p = {}\n\n\nasync def get(uid):\n    hit = _p.get(uid)\n    if hit:\n        return hit\n    v = await load(uid)\n    _p[uid] = v\n    return v\n',
    ],
  },
  {
    law: 'TestRigKeepsRouteGuardsLaw.check',
    check: c => TestRigKeepsRouteGuardsLaw.check(c),
    base: {
      'package.json': manifest({ '@angular/router': '20.0.0' }),
      'src/app.routes.ts':
        "export const routes = [{ path: 'items', canMatch: [guard], component: X }];\n",
    },
    subject: [
      'local/items.spec.ts',
      "TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'items', component: X }])] });\n",
    ],
  },
  {
    law: 'PerfHarnessMatchesProductionLaw.check',
    check: c => PerfHarnessMatchesProductionLaw.check(c),
    base: {},
    subject: ['local/perf/run.sh', 'uvicorn app:app --log-level debug\n'],
  },
];

describe.each(CASES)(
  '$law reads what git publishes',
  ({ law, check, base, subject }) => {
    const requires = CACHE_HARNESS_LAWS.find(
      entry => entry.checkFunction === law
    )?.requires;
    const [rel, content] = subject;

    it('a git-ignored subject does not select the law', () => {
      const root = repo(
        { ...base, '.gitignore': 'local/\n', [rel]: content },
        Object.keys(base).concat('.gitignore')
      );
      expect(lawRequirementsMet(requires, root)).toBe(false);
    });

    it('a tracked subject selects it, and the finding names that file', () => {
      const root = repo({ ...base, [rel]: content }, [
        ...Object.keys(base),
        rel,
      ]);
      expect(lawRequirementsMet(requires, root)).toBe(true);
      const result = check(ctx(root));
      expect(result.passed).toBe(false);
      expect(result.violations?.some(v => v.startsWith(`${rel}:`))).toBe(true);
    });

    it('ignores.global leaves the file out of the gate and the law', () => {
      const root = repo({ ...base, [rel]: content }, [
        ...Object.keys(base),
        rel,
      ]);
      const ignores = ['local/**'];
      expect(lawRequirementsMet(requires, root, ignores)).toBe(false);
      const result = check(
        ctx(root, {
          ignores: { global: ignores, tests: [], build: [], design: [] },
        })
      );
      expect(result.violations?.some(v => v.startsWith(`${rel}:`))).toBe(false);
    });
  }
);
