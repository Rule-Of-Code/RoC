/**
 * #384: one-off scripts are not a request path.
 *
 * A backfill under scripts/, a migration, a CLI entry point under bin/ or a
 * Django management command runs once; its sequential awaits are not latency
 * every user pays. The request-path laws (#351, #353, #354 and the N+1 check
 * of Database Query Optimization) leave those locations out. For #351 the
 * `anyFileContaining` gate excludes them, so the gate and the law still read
 * one set; the other three read the shared source discovery, which leaves
 * them out and counts them.
 */
import { CountWithAggregationLaw } from '../../../src/checkers/request-path-laws/count-with-aggregation';
import { DocumentReadOncePerRequestLaw } from '../../../src/checkers/request-path-laws/document-read-once-per-request';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { PERFORMANCE_LAWS } from '../../../src/data/performance-laws';
import {
  REQUEST_PATH_LAWS,
  REQUIRES_ASYNC_CODE,
} from '../../../src/data/request-path-laws';
import { DatabaseQueryOptimizationLaw } from '../../../src/laws/performance/database-query-optimization';
import {
  lawRequirementsMet,
  readFilesContaining,
} from '../../../src/utils/law-requirements';
import { isOneOffScript } from '../../../src/utils/request-path/one-off-scripts';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const lines = (...l: string[]): string => l.join('\n') + '\n';
const PYPROJECT =
  '[project]\nname = "svc"\ndependencies = ["fastapi", "google-cloud-firestore"]\n';
const PACKAGE = JSON.stringify({
  name: 'svc',
  dependencies: { 'firebase-admin': '^12.0.0' },
});

const PY_INDEPENDENT = lines(
  'async def run(uid, repo):',
  '    roles = await repo.roles.list(uid)',
  '    levels = await repo.levels.list(uid)',
  '    return roles, levels'
);
const TS_INDEPENDENT = lines(
  'export async function run(uid: string, repo: any) {',
  '  const roles = await repo.roles.list(uid);',
  '  const levels = await repo.levels.list(uid);',
  '  return { roles, levels };',
  '}'
);
const PY_COUNT = lines(
  'async def count_users(q):',
  '    return len(await q.get())'
);
const PY_LOOP_READ = lines(
  'async def load_roles(db, ids):',
  '    out = []',
  '    for i in ids:',
  '        snap = await db.collection("roles").document(i).get()',
  '        out.append(snap.to_dict())',
  '    return out'
);

/** The #351 gate's verdict and the files the law reads, for one project. */
function gateAndLaw(root: string) {
  const selected = lawRequirementsMet(REQUIRES_ASYNC_CODE, root);
  const read = (REQUIRES_ASYNC_CODE.anyFileContaining ?? [])
    .flatMap(entry => readFilesContaining(root, entry))
    .map(f => f.rel);
  return {
    selected,
    read,
    result: IndependentAwaitsRunConcurrentlyLaw.check(ctx(root)),
  };
}

describe('#384 one-off locations', () => {
  it.each([
    ['scripts/backfill.py', true],
    ['backend/scripts/backfill.py', true],
    ['migrations/0002_backfill.py', true],
    ['alembic/versions/abc_backfill.py', true],
    ['bin/sync.ts', true],
    ['shop/management/commands/backfill.py', true],
    ['db/seeds/users.ts', true],
    ['app/routes/profile.py', false],
    ['src/scripting/engine.ts', false],
    ['app/binary.py', false],
  ])('%s → one-off: %s', (rel, expected) => {
    expect(isOneOffScript(rel)).toBe(expected);
  });
});

describe('#384 Independent Awaits Run Concurrently', () => {
  it('independent awaits only in scripts/backfill.py: not reported (the gate does not select the law)', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'scripts/backfill.py': PY_INDEPENDENT,
    });
    const { selected, read, result } = gateAndLaw(root);
    expect(selected).toBe(false);
    expect(read).toEqual([]);
    expect(result.violations?.join('\n')).not.toMatch(
      /independent awaits run one after another/
    );
  });

  it('the same awaits in a request handler: reported', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'app/routes/profile.py': PY_INDEPENDENT,
    });
    const { selected, result } = gateAndLaw(root);
    expect(selected).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^app\/routes\/profile\.py:2: 2 independent awaits/
      ),
    ]);
  });

  it('both: only the handler is judged, and the gate and the law read the same files', () => {
    const root = project({
      'package.json': PACKAGE,
      'src/handler.ts': TS_INDEPENDENT,
      'scripts/backfill.ts': TS_INDEPENDENT,
      'bin/sync.ts': TS_INDEPENDENT,
      'migrations/001-backfill.ts': TS_INDEPENDENT,
    });
    const { selected, read, result } = gateAndLaw(root);
    expect(selected).toBe(true);
    expect(read).toEqual(['src/handler.ts']);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/handler\.ts:2: /),
    ]);
  });

  it('a Django management command is not judged', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'shop/management/commands/backfill.py': PY_INDEPENDENT,
    });
    expect(gateAndLaw(root).selected).toBe(false);
  });
});

describe('#384 the laws on the shared source discovery', () => {
  it('Count With An Aggregation: a count by fetch in scripts/ is not reported, and is counted as not judged', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'app/stats.py': lines('def ok():', '    return 1'),
      'scripts/report.py': PY_COUNT,
    });
    const result = CountWithAggregationLaw.check(ctx(root));
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 source file\(s\) read .*1 one-off script\(s\) under scripts\/.* not judged/
    );
    expect(result.metrics).toEqual(
      expect.objectContaining({ filesRead: 1, oneOffScriptsSkipped: 1 })
    );
  });

  it('Count With An Aggregation: the same in a request handler is reported', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'app/stats.py': PY_COUNT,
    });
    const result = CountWithAggregationLaw.check(ctx(root));
    expect(result.violations).toEqual([
      expect.stringMatching(/^app\/stats\.py:2: len\(await q\.get\(\)\)/),
    ]);
  });

  it('only one-off scripts: judged nothing, never a pass', () => {
    const root = project({
      'pyproject.toml': PYPROJECT,
      'scripts/report.py': PY_COUNT,
    });
    const result = CountWithAggregationLaw.check(ctx(root));
    expect(result.judgedNothing).toBe(true);
    expect(result.violations?.[0]).toMatch(
      /outside tests and one-off scripts \(1 under scripts\//
    );
  });

  it('Document Read Once Per Request: reads in a migration are not compared', () => {
    const read = lines(
      'async def load(db, uid):',
      '    return await db.collection("users").document(uid).get()'
    );
    const root = project({
      'pyproject.toml': PYPROJECT,
      'app/handlers.py': lines('def ok():', '    return 1'),
      'migrations/0003_fix.py': lines(
        'async def fix(db, uid):',
        '    a = await db.collection("users").document(uid).get()',
        '    b = await db.collection("users").document(uid).get()',
        '    return a, b'
      ),
      'scripts/one.py': read,
    });
    const result = DocumentReadOncePerRequestLaw.check(ctx(root));
    expect(result.passed).toBe(true);
    // Python discovery already leaves migrations/ out; scripts/ is the one counted here.
    expect(result.metrics).toEqual(
      expect.objectContaining({ filesRead: 1, oneOffScriptsSkipped: 1 })
    );
  });

  it('N+1 (Database Query Optimization): a read per loop item in scripts/ is not reported; in the app it is', async () => {
    const nPlusOne = async (files: Record<string, string>) =>
      (
        (await DatabaseQueryOptimizationLaw.check(ctx(project(files))))
          .violations ?? []
      ).filter(v => /\(N\+1\)/.test(v));
    expect(
      await nPlusOne({
        'pyproject.toml': PYPROJECT,
        'app/ok.py': lines('def ok():', '    return 1'),
        'scripts/backfill.py': PY_LOOP_READ,
      })
    ).toEqual([]);
    expect(
      await nPlusOne({
        'pyproject.toml': PYPROJECT,
        'app/roles.py': PY_LOOP_READ,
      })
    ).toEqual([expect.stringMatching(/^app\/roles\.py:4: /)]);
  });
});

describe('#384 detectionLimits state the scope', () => {
  const limits = (title: string): string =>
    [...REQUEST_PATH_LAWS, ...PERFORMANCE_LAWS]
      .find(law => law.title === title)
      ?.detectionLimits?.join(' ') ?? '';
  it.each([
    'Independent Awaits Run Concurrently',
    'Document Read Once Per Request',
    'Count With An Aggregation',
    'Database Query Optimization',
  ])('%s', title => {
    expect(limits(title)).toMatch(
      /scripts\/.*migrations\/.*bin\/.*management\/commands\//
    );
  });
});
