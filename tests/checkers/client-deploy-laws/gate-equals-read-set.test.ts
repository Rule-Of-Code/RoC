/**
 * The files that SELECT a law (`requires.anyFileContaining`) are the files
 * the law then READS: an untracked, not-ignored file with the subject
 * selects the law and is judged — never "judged nothing" — and a git-ignored
 * one selects nothing. Checked for every law with such a gate: #351, #355,
 * #357, #359. Plus #357's gate wants a command, not the words in prose.
 */
import { PrimaryLocaleFontPreloadedLaw } from '../../../src/checkers/client-deploy-laws/primary-locale-font-preloaded';
import { ServerlessDeployPinsResourcesLaw } from '../../../src/checkers/client-deploy-laws/serverless-deploy-pins-resources';
import { LatencyBudgetHarnessRealismLaw } from '../../../src/checkers/measurement-laws/latency-budget-harness-realism';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { ConfigLoader } from '../../../src/config/loader';
import { RuleOfCodeAuditor } from '../../../src/core/auditing/audit-engine';
import { CLIENT_DEPLOY_LAWS } from '../../../src/data/client-deploy-laws';
import { MEASUREMENT_LAWS } from '../../../src/data/measurement-laws';
import { REQUEST_PATH_LAWS } from '../../../src/data/request-path-laws';
import type { EnhancedConstitutionalLaw } from '../../../src/types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../../src/types/law.types';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const byCheck = (laws: EnhancedConstitutionalLaw[], check: string): EnhancedConstitutionalLaw => {
  const found = laws.find(law => law.checkFunction === check);
  if (!found) throw new Error(check);
  return found;
};

interface Case {
  name: string;
  law: EnhancedConstitutionalLaw;
  check: (context: LawCheckContext) => LawResult;
  files: Record<string, string>;
  /** The file that carries the subject; left untracked. */
  subject: string;
}

const SPLIT_FONT = [
  "@font-face { font-family: 'Body'; src: url(body-latin.woff2); unicode-range: U+0000-00FF; }",
  "@font-face { font-family: 'Body'; src: url(body-cyrillic.woff2); unicode-range: U+0400-045F; }",
].join('\n');

const CASES: Case[] = [
  {
    name: '#351 Independent Awaits Run Concurrently',
    law: byCheck(REQUEST_PATH_LAWS, 'IndependentAwaitsRunConcurrentlyLaw.check'),
    check: context => IndependentAwaitsRunConcurrentlyLaw.check(context),
    files: { 'pyproject.toml': '[project]\nname = "svc"\n', 'app/profile.py': 'async def profile(db):\n    return await db.get()\n' },
    subject: 'app/profile.py',
  },
  {
    name: '#355 Latency Budget Harness Realism',
    law: byCheck(MEASUREMENT_LAWS, 'LatencyBudgetHarnessRealismLaw.check'),
    check: context => LatencyBudgetHarnessRealismLaw.check(context),
    files: { 'perf/latency_budget.json': '{"p95_ms": 300}' },
    subject: 'perf/latency_budget.json',
  },
  {
    name: '#357 Serverless Deploy Pins Resources',
    law: byCheck(CLIENT_DEPLOY_LAWS, 'ServerlessDeployPinsResourcesLaw.check'),
    check: context => ServerlessDeployPinsResourcesLaw.check(context),
    files: { 'scripts/deploy.sh': 'gcloud run deploy api --region x\n' },
    subject: 'scripts/deploy.sh',
  },
  {
    name: '#359 Primary Locale Font Preloaded',
    law: byCheck(CLIENT_DEPLOY_LAWS, 'PrimaryLocaleFontPreloadedLaw.check'),
    check: context => PrimaryLocaleFontPreloadedLaw.check(context),
    files: { 'src/index.html': '<html lang="bg"><head></head></html>', 'src/fonts.css': SPLIT_FONT },
    subject: 'src/fonts.css',
  },
];

describe.each(CASES)('$name: the gate set is the read set', ({ law, check, files, subject }) => {
  it('an untracked, not-ignored file with the subject selects the law, and the law judges it', () => {
    const root = repo(files, Object.keys(files).filter(file => file !== subject));
    expect(lawRequirementsMet(law.requires, root)).toBe(true);
    const result = check(ctx(root));
    expect(result.judgedNothing).not.toBe(true);
  });

  it('the same file git-ignored selects nothing', () => {
    const root = repo({ ...files, '.gitignore': `${subject}\n` }, ['.gitignore', ...Object.keys(files).filter(file => file !== subject)]);
    expect(lawRequirementsMet(law.requires, root)).toBe(false);
  });
});

describe('#357: the gate wants a command, as the detector does', () => {
  const DEPLOY = byCheck(CLIENT_DEPLOY_LAWS, 'ServerlessDeployPinsResourcesLaw.check');

  it.each([
    ['prose in a JSON string', { 'data/law.json': '{"text":"run gcloud run deploy my-svc"}' }],
    ['a quoted name in prose', { 'scripts/release.sh': 'fail "this is the bare \'gcloud run deploy\' it prevents"\n' }],
    ['a comment', { 'scripts/release.sh': '# gcloud run deploy api --region x\n' }],
    ['a sentence in YAML', { 'docs.yml': 'note: we stopped using gcloud run deploy by hand\n' }],
    ['a Cloud Build step that runs another gcloud command', { 'cloudbuild.yaml': "steps:\n- name: gcr.io/cloud-builders/gcloud\n  args: ['builds', 'submit']\n" }],
    ['az functionapp create on a Consumption plan', { 'scripts/az.sh': 'az functionapp create -g rg -n app --consumption-plan-location westus\n' }],
  ])('%s does not select it', (_name, files) => {
    expect(lawRequirementsMet(DEPLOY.requires, project(files as Record<string, string>))).toBe(false);
  });

  it.each([
    ['a workflow run line', { 'w.yml': '      - run: gcloud run deploy api\n' }],
    ['a block scalar line', { 'w.yml': '        run: |\n          gcloud beta run services replace s.yaml\n' }],
    ['after &&', { 'd.sh': 'cd svc && gcloud run deploy api\n' }],
    ['a package.json script', { 'package.json': '{ "scripts": { "deploy": "gcloud run deploy api" } }' }],
    ['a Cloud Build args step', { 'cloudbuild.yaml': "steps:\n- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'\n  entrypoint: gcloud\n  args: ['run', 'deploy', 'api']\n" }],
    ['a Cloud Build block args step', { 'cloudbuild.yaml': 'steps:\n- name: gcr.io/cloud-builders/gcloud\n  args:\n  - run\n  - deploy\n' }],
    ['az functionapp create on Flex Consumption, continued', { 'az.ps1': 'az functionapp create -g rg -n app `\n  --flexconsumption-location northeurope\n' }],
    ['the deploy action', { 'w.yml': '      - uses: google-github-actions/deploy-cloudrun@v2\n' }],
    ['a SAM function', { 'template.yaml': 'Resources:\n  Api:\n    Type: AWS::Serverless::Function\n' }],
    ['a CloudFormation JSON function', { 't.json': '{ "Resources": { "F": { "Type": "AWS::Lambda::Function" } } }' }],
    ['serverless.yml functions', { 'serverless.yml': 'service: s\nfunctions:\n  hello:\n    handler: h\n' }],
    ['host.json v2', { 'host.json': '{ "version": "2.0" }' }],
  ])('%s selects it', (_name, files) => {
    expect(lawRequirementsMet(DEPLOY.requires, project(files as Record<string, string>))).toBe(true);
  });
});

describe('the engine: a git-ignored file with the text does not count the law', () => {
  it('scope.applicableLaws is the same with the ignored file as without it', async () => {
    const BASE = {
      'package.json': JSON.stringify({ name: 'a', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
      'index.ts': 'export const one = 1;\n',
      'ruleofcode.config.json': JSON.stringify({ project: { type: 'typescript' }, laws: { minLawsChecked: 9999 } }),
    };
    const applicable = async (root: string): Promise<number> => {
      const spies = [
        jest.spyOn(console, 'log').mockImplementation(() => undefined),
        jest.spyOn(console, 'warn').mockImplementation(() => undefined),
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
      ];
      try {
        const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
        return (await auditor.audit()).scope?.applicableLaws ?? -1;
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    };
    const tracked = Object.keys(BASE);
    const none = await applicable(repo(BASE, tracked));
    const ignored = await applicable(repo({ ...BASE, '.gitignore': 'data/\n', 'data/law.sh': 'gcloud run deploy my-svc\n' }, [...tracked, '.gitignore']));
    const published = await applicable(repo({ ...BASE, 'data/law.sh': 'gcloud run deploy my-svc\n' }, [...tracked, 'data/law.sh']));
    expect(ignored).toBe(none);
    expect(published).toBe(none + 1);
  });
});

describe('a pass counts what it read (#357, #359)', () => {
  const ALL = '--cpu=1 --memory=512Mi --concurrency=80 --timeout=60 --max-instances=10';

  it('#357: every flag pinned → a pass naming the commands judged and the files read', () => {
    const result = ServerlessDeployPinsResourcesLaw.check(ctx(project({ 'scripts/deploy.sh': `gcloud run deploy api ${ALL}\n` })));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('1 deploy command(s) / definition(s) judged in 1 file(s)');
    expect(result.metrics).toMatchObject({ filesRead: 1, commandsAndDefinitionsJudged: 1 });
  });

  it('#357: selected by a line the detector does not take for a command → a pass that says it found nothing to judge', () => {
    const files = { 'w.yml': 'steps:\n  # run: gcloud run deploy api\n  - run: npm test\n' };
    const DEPLOY = byCheck(CLIENT_DEPLOY_LAWS, 'ServerlessDeployPinsResourcesLaw.check');
    expect(lawRequirementsMet(DEPLOY.requires, project(files))).toBe(true);
    const result = ServerlessDeployPinsResourcesLaw.check(ctx(project(files)));
    expect(result.passed).toBe(true);
    expect(result.judgedNothing).not.toBe(true);
    expect(result.message).toMatch(/1 file\(s\) read, no serverless deploy command or definition in them to judge/);
  });

  it('#359: a split family and a Latin locale → a pass with the counts', () => {
    const result = PrimaryLocaleFontPreloadedLaw.check(ctx(project({ 'src/fonts.css': SPLIT_FONT, 'src/index.html': '<html lang="en"></html>' })));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('1 split family in 1 file(s), locale(s) en');
    expect(result.metrics).toMatchObject({ faceFilesRead: 1, splitFamilies: 1, localesJudged: 1 });
  });

  it('#359: one face with a unicode-range, no split family → a pass that says there is no subset to preload', () => {
    const one = "@font-face { font-family: 'Body'; src: url(body.woff2); unicode-range: U+0000-00FF; }";
    const result = PrimaryLocaleFontPreloadedLaw.check(ctx(project({ 'src/fonts.css': one, 'src/index.html': '<html lang="bg"></html>' })));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('1 file(s) with @font-face read, no family is split into subsets by unicode-range');
  });
});
