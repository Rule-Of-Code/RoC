/**
 * `ignores.global` is what the project says is not its own code (#326). The
 * `anyFileContaining` gate and the laws that read through it honour the same
 * list, so the set that selects a law is still the set it judges: async code
 * only under an ignored directory selects nothing, and a law selected by a
 * file elsewhere does not report the ignored one.
 */
import { ServerlessDeployPinsResourcesLaw } from '../../../src/checkers/client-deploy-laws/serverless-deploy-pins-resources';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { ConfigLoader } from '../../../src/config/loader';
import { RuleOfCodeAuditor } from '../../../src/core/auditing/audit-engine';
import { CLIENT_DEPLOY_LAWS } from '../../../src/data/client-deploy-laws';
import { REQUEST_PATH_LAWS } from '../../../src/data/request-path-laws';
import type { LawRequirement } from '../../../src/types/enhanced-law.types';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const met: (requires: LawRequirement | undefined, root: string, ignores?: readonly string[]) => boolean = lawRequirementsMet;
const AWAITS = REQUEST_PATH_LAWS.find(law => law.checkFunction === 'IndependentAwaitsRunConcurrentlyLaw.check');
const DEPLOY = CLIENT_DEPLOY_LAWS.find(law => law.checkFunction === 'ServerlessDeployPinsResourcesLaw.check');
const IGNORES = ['legacy/**'];
const withIgnores = (root: string) => ctx(root, { ignores: { global: IGNORES, tests: [], build: [], design: [] } });

/** Three independent awaits: a finding wherever the law reads it. */
const SEQUENTIAL = ['async def load(db):', '    a = await db.users()', '    b = await db.posts()', '    c = await db.tags()', '    return a, b, c', ''].join('\n');
const CLEAN = 'async def one(db):\n    return await db.users()\n';

describe('the gate and the law honour ignores.global', () => {
  it('#351: async code only in an ignored directory does not select the law', () => {
    const root = project({ 'pyproject.toml': '[project]\nname = "svc"\n', 'legacy/old.py': SEQUENTIAL });
    expect(met(AWAITS?.requires, root)).toBe(true);
    expect(met(AWAITS?.requires, root, IGNORES)).toBe(false);
  });

  it('#351: selected by a file outside it, the law judges that file and not the ignored one', () => {
    const root = project({ 'pyproject.toml': '[project]\nname = "svc"\n', 'legacy/old.py': SEQUENTIAL, 'app/new.py': CLEAN });
    expect(met(AWAITS?.requires, root, IGNORES)).toBe(true);
    const result = IndependentAwaitsRunConcurrentlyLaw.check(withIgnores(root));
    expect(result.judgedNothing).not.toBe(true);
    expect(result.violations).toEqual([]);
    expect(IndependentAwaitsRunConcurrentlyLaw.check(ctx(root)).violations).toEqual([expect.stringMatching(/^legacy\/old\.py:/)]);
  });

  it('#357: a deploy script in an ignored directory neither selects nor is judged', () => {
    const root = project({ 'legacy/deploy.sh': 'gcloud run deploy api\n', 'scripts/deploy.sh': 'gcloud run deploy api --cpu=1 --memory=1Gi --concurrency=8 --timeout=60 --max-instances=3\n' });
    expect(met(DEPLOY?.requires, project({ 'legacy/deploy.sh': 'gcloud run deploy api\n' }), IGNORES)).toBe(false);
    const result = ServerlessDeployPinsResourcesLaw.check(withIgnores(root));
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ filesRead: 1 });
  });

  it('the engine: async code only under an ignored directory does not count #351 in scope.applicableLaws', async () => {
    const applicable = async (files: Record<string, string>): Promise<{ count: number; names: string[] }> => {
      const root = project({
        ...files,
        'pyproject.toml': '[project]\nname = "svc"\n',
        'ruleofcode.config.json': JSON.stringify({ project: { type: 'python' }, ignores: { global: IGNORES }, laws: { minLawsChecked: 9999 } }),
      });
      const spies = [
        jest.spyOn(console, 'log').mockImplementation(() => undefined),
        jest.spyOn(console, 'warn').mockImplementation(() => undefined),
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
      ];
      try {
        const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
        const count = (await auditor.audit()).scope?.applicableLaws ?? -1;
        const names = (auditor as unknown as { getSelectedLaws(): Array<{ name?: string }> }).getSelectedLaws().map(law => law.name ?? '');
        return { count, names };
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    };
    const none = await applicable({ 'app/main.py': 'print(1)\n' });
    const ignored = await applicable({ 'app/main.py': 'print(1)\n', 'legacy/old.py': SEQUENTIAL });
    const own = await applicable({ 'app/main.py': CLEAN });
    expect(ignored.names).not.toContain(AWAITS?.title);
    expect(ignored.count).toBe(none.count);
    expect(own.names).toContain(AWAITS?.title);
    expect(own.count).toBe(none.count + 1);
  });
});
