/**
 * #351: independent awaits run one after another.
 *
 * Red: a run of awaited calls in one async function where no call uses an
 * earlier result — one finding per run, listing every call. Green: the calls
 * gathered, a dependent chain, ordered writes, a transaction, a reasoned
 * marker, and anything outside an async function.
 */
import { IndependentAwaitsRunConcurrentlyLaw } from '../../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const PYPROJECT = '[project]\nname = "svc"\ndependencies = ["fastapi"]\n';
const PACKAGE = '{ "name": "svc", "private": true }';

function check(files: Record<string, string>) {
  return IndependentAwaitsRunConcurrentlyLaw.check(ctx(project(files)));
}

const py = (body: string[]): Record<string, string> => ({ 'pyproject.toml': PYPROJECT, 'app/profile.py': body.join('\n') + '\n' });
const tsx = (body: string[]): Record<string, string> => ({ 'package.json': PACKAGE, 'src/profile.ts': body.join('\n') + '\n' });

describe('Independent Awaits Run Concurrently (#351)', () => {
  describe('red', () => {
    it('Python: 3 independent awaits → 1 finding listing the 3 calls', () => {
      const result = check(
        py([
          'async def build_profile(uid, repo):',
          '    roles = await repo.roles.list(uid)',
          '    levels = await repo.levels.list(uid)',
          '    memberships = await repo.memberships.list(uid)',
          '    return {"roles": roles, "levels": levels, "memberships": memberships}',
        ])
      );
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringMatching(
          /^app\/profile\.py:2: 3 independent awaits run one after another in build_profile\(\) — repo\.roles\.list\(\) \(line 2\), repo\.levels\.list\(\) \(line 3\), repo\.memberships\.list\(\) \(line 4\);.*asyncio\.gather/
        ),
      ]);
    });

    it('TS: 3 independent awaits → 1 finding listing the 3 calls', () => {
      const result = check(
        tsx([
          'export async function buildProfile(uid: string, repo: any) {',
          '  const roles = await repo.roles.list(uid);',
          '  const levels = await repo.levels.list(uid);',
          '  const memberships = await repo.memberships.list(uid);',
          '  return { roles, levels, memberships };',
          '}',
        ])
      );
      expect(result.violations).toEqual([
        expect.stringMatching(
          /^src\/profile\.ts:2: 3 independent awaits .* in buildProfile\(\) — repo\.roles\.list\(\) \(line 2\), repo\.levels\.list\(\) \(line 3\), repo\.memberships\.list\(\) \(line 4\);.*Promise\.all/
        ),
      ]);
    });

    it('two awaits inside one expression run one after another too', () => {
      const result = check(py(['async def summary(uid, repo):', '    return {"a": await repo.a(uid), "b": await repo.b(uid)}']));
      expect(result.violations).toEqual([expect.stringMatching(/^app\/profile\.py:2: 2 independent awaits .* repo\.a\(\) \(line 2\), repo\.b\(\) \(line 2\)/)]);
    });

    it('a dependent call splits the run: what follows it is judged on its own', () => {
      const result = check(
        py([
          'async def page(uid, repo):',
          '    user = await repo.users.get(uid)',
          '    team = await repo.teams.get(user.team_id)',
          '    badges = await repo.badges.list(user.id)',
          '    return user, team, badges',
        ])
      );
      // team and badges both need user, but not each other.
      expect(result.violations).toEqual([expect.stringMatching(/^app\/profile\.py:3: 2 independent awaits .* repo\.teams\.get\(\) \(line 3\), repo\.badges\.list\(\) \(line 4\)/)]);
    });

    it('a marker without a reason does not count', () => {
      const result = check(
        py(['async def f(uid, repo):', '    a = await repo.a(uid)', '    b = await repo.b(uid)  # roc: sequential-ok', '    return a, b'])
      );
      expect(result.violations).toHaveLength(1);
    });
  });

  describe('green', () => {
    it('gather(...) and Promise.all([...])', () => {
      expect(
        check({
          ...py(['import asyncio', '', 'async def f(uid, repo):', '    a, b = await asyncio.gather(repo.a(uid), repo.b(uid))', '    return a, b']),
          ...tsx(['export async function f(uid: string, repo: any) {', '  const [a, b] = await Promise.all([repo.a(uid), repo.b(uid)]);', '  return { a, b };', '}']),
        }).violations
      ).toEqual([]);
    });

    it('a dependent chain', () => {
      expect(
        check({
          ...py(['async def f(uid, repo):', '    user = await repo.users.get(uid)', '    team = await repo.teams.get(user.team_id)', '    return team']),
          ...tsx(['export async function f(uid: string, repo: any) {', '  const user = await repo.users.get(uid);', '  const team = await repo.teams.get(user.teamId);', '  return team;', '}']),
        }).violations
      ).toEqual([]);
    });

    it('ordered writes: a transaction, and write-then-read of the same key', () => {
      expect(
        check(
          py([
            'async def transfer(repo, src, dst, amount):',
            '    async with repo.transaction() as tx:',
            '        await tx.debit(src, amount)',
            '        await tx.credit(dst, amount)',
            '',
            'async def rename(repo, uid, name):',
            '    await repo.users.set(uid, {"name": name})',
            '    return await repo.users.get(uid)',
          ])
        ).violations
      ).toEqual([]);
    });

    it('a reasoned marker on the line, in Python and in TS', () => {
      expect(
        check({
          ...py(['async def f(uid, repo):', '    a = await repo.a(uid)', '    b = await repo.b(uid)  # roc: sequential-ok the audit trail needs this order', '    return a, b']),
          ...tsx(['export async function f(uid: string, repo: any) {', '  const a = await repo.a(uid);', '  const b = await repo.b(uid); // roc: sequential-ok the audit trail needs this order', '  return { a, b };', '}']),
        }).violations
      ).toEqual([]);
    });

    it('a guard between the awaits keeps their order', () => {
      expect(
        check(py(['async def f(uid, repo):', '    user = await repo.users.get(uid)', '    if user is None:', '        raise LookupError(uid)', '    return await repo.teams.get(uid)'])).violations
      ).toEqual([]);
    });

    it('an awaited guard whose result is discarded (a check that raises) keeps its place', () => {
      expect(
        check({
          ...py(['async def f(uid, repo, guards):', '    await guards.admit(uid)', '    a = await repo.a(uid)', '    return a']),
          ...tsx(['export async function f(uid: string, repo: any, guards: any) {', '  await guards.admit(uid);', '  const a = await repo.a(uid);', '  return a;', '}']),
        }).violations
      ).toEqual([]);
    });

    it('two calls that share a freshly created list (one fills it, one reads it)', () => {
      expect(check(py(['async def f(repo):', '    rows = []', '    await repo.fill(rows)', '    await repo.export(rows)'])).violations).toEqual([]);
    });

    it('nothing outside async functions: sync def with blocking calls, TS module top-level await', () => {
      const result = check({
        ...py(['def f(uid, repo):', '    a = repo.a(uid)', '    b = repo.b(uid)', '    return a, b', '', 'async def g(uid, repo):', '    return await repo.c(uid)']),
        'src/boot.ts': 'const a = await load("a");\nconst b = await load("b");\nexport { a, b };\n',
        'package.json': PACKAGE,
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  it('a project with no async function has nothing to judge: it says so and does not pass', () => {
    const result = check(py(['def f(repo):', '    return repo.a()']));
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.violations?.[0]).toMatch(/nothing was judged — no async function in 1 Python and 0 TS\/JS source file\(s\)/);
  });
});
