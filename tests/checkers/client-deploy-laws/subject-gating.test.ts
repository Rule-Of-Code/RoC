/**
 * #357 and #359 are selected only where their subject exists: a serverless
 * deploy command or definition, a @font-face family split by unicode-range.
 * Without it the law is not selected — not counted, not a pass, not "judged
 * nothing" — both through `lawRequirementsMet` and in the engine's scope.
 */
import { ConfigLoader } from '../../../src/config/loader';
import { RuleOfCodeAuditor } from '../../../src/core/auditing/audit-engine';
import { CLIENT_DEPLOY_LAWS } from '../../../src/data/client-deploy-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const law = (title: string) => {
  const found = CLIENT_DEPLOY_LAWS.find(candidate => candidate.title === title);
  if (!found) throw new Error(`no law ${title}`);
  return found;
};
const DEPLOY = law('Serverless Deploy Pins Resources');
const FONT = law('Primary Locale Font Preloaded');

const SPLIT_FONT = [
  "@font-face { font-family: 'Body'; src: url(body-latin.woff2); unicode-range: U+0000-00FF; }",
  "@font-face { font-family: 'Body'; src: url(body-cyrillic.woff2); unicode-range: U+0400-045F; }",
].join('\n');

describe('requires: Serverless Deploy Pins Resources', () => {
  it('is not met without a serverless deploy (CI, scripts and manifests that deploy nothing)', () => {
    const root = project({
      '.github/workflows/ci.yml':
        'jobs:\n  t:\n    steps:\n      - run: npm test\n',
      'scripts/build.sh': 'npm run build\n',
      'package.json': JSON.stringify({ name: 'x', scripts: { build: 'tsc' } }),
      'docs/deploy.md': 'Run gcloud run deploy by hand.\n',
    });
    expect(lawRequirementsMet(DEPLOY.requires, root)).toBe(false);
  });

  it.each([
    [
      'a deploy script',
      { 'scripts/deploy.sh': 'gcloud run deploy api --region x\n' },
    ],
    [
      'a workflow step',
      {
        '.github/workflows/release.yml':
          'jobs:\n  d:\n    steps:\n      - run: gcloud beta run services replace service.yaml\n',
      },
    ],
    [
      'a Cloud Build args step',
      {
        'cloudbuild.yaml':
          "steps:\n- name: gcr.io/cloud-builders/gcloud\n  args: ['run', 'deploy', 'api']\n",
      },
    ],
    [
      'the deploy action',
      {
        '.github/workflows/d.yml':
          '      - uses: google-github-actions/deploy-cloudrun@v2\n',
      },
    ],
    [
      'a package.json script',
      {
        'package.json': JSON.stringify({
          scripts: { deploy: 'aws lambda create-function --function-name f' },
        }),
      },
    ],
    [
      'a SAM template',
      {
        'template.yaml':
          'Resources:\n  Api:\n    Type: AWS::Serverless::Function\n',
      },
    ],
    [
      'a serverless.yml in a workspace app',
      {
        'apps/api/serverless.yml':
          'service: s\nfunctions:\n  hello:\n    handler: h\n',
      },
    ],
    ['an Azure Functions host.json', { 'host.json': '{ "version": "2.0" }' }],
  ])('is met by %s', (_name, files) => {
    expect(
      lawRequirementsMet(
        DEPLOY.requires,
        project(files as Record<string, string>)
      )
    ).toBe(true);
  });
});

describe('requires: Primary Locale Font Preloaded', () => {
  it('is not met without a family split by unicode-range', () => {
    const root = project({
      'src/styles.css':
        '@font-face { font-family: X; src: url(x.woff2); }\nbody { unicode-bidi: normal; }',
      'src/index.html': '<html lang="bg"></html>',
    });
    expect(lawRequirementsMet(FONT.requires, root)).toBe(false);
  });

  it('is met by a stylesheet, or an HTML <style> block, with @font-face and unicode-range', () => {
    expect(
      lawRequirementsMet(
        FONT.requires,
        project({ 'libs/ui/src/fonts.scss': SPLIT_FONT })
      )
    ).toBe(true);
    expect(
      lawRequirementsMet(
        FONT.requires,
        project({ 'public/index.html': `<style>${SPLIT_FONT}</style>` })
      )
    ).toBe(true);
  });
});

describe('the engine does not count a law whose subject is absent', () => {
  const scopeOf = async (files: Record<string, string>, type: string) => {
    const root = project({
      ...files,
      'ruleofcode.config.json': JSON.stringify({
        project: { type },
        laws: { minLawsChecked: 9999 },
      }),
    });
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
      jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
    ];
    try {
      const auditor = await RuleOfCodeAuditor.create({
        projectRoot: root,
        config: ConfigLoader.load(root),
        mode: 'full',
      });
      const result = await auditor.audit();
      const selected = (
        auditor as unknown as {
          getSelectedLaws(): Array<{ name?: string; title?: string }>;
        }
      )
        .getSelectedLaws()
        .map(selection => selection.name ?? selection.title);
      return { applicable: result.scope?.applicableLaws ?? -1, selected };
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  };

  const NODE = {
    'package.json': JSON.stringify({
      name: 'a',
      version: '1.0.0',
      devDependencies: { typescript: '5.6.3' },
    }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
    'src/index.ts': 'export const one = 1;\n',
  };

  it('Serverless Deploy Pins Resources: out of the selection and of scope.applicableLaws without a deploy', async () => {
    const without = await scopeOf(NODE, 'typescript');
    const withDeploy = await scopeOf(
      { ...NODE, 'scripts/deploy.sh': 'gcloud run deploy api\n' },
      'typescript'
    );
    expect(without.selected).not.toContain(DEPLOY.title);
    expect(withDeploy.selected).toContain(DEPLOY.title);
    // A deploy target also selects the laws about a product that runs for
    // users (#428), and nothing else.
    const RUNTIME = [
      'Performance Monitoring Standards',
      'Incident Response Protocol',
      'Launch Readiness Checklist',
      'Authentication Security',
      'API Security Standards',
      'Environment Parity Standards',
    ];
    expect(
      withDeploy.selected.filter(name => !without.selected.includes(name))
    ).toEqual(expect.arrayContaining([DEPLOY.title, ...RUNTIME]));
    expect(withDeploy.applicable).toBe(without.applicable + 1 + RUNTIME.length);
  });

  it('Primary Locale Font Preloaded: out of the selection and of scope.applicableLaws without a split font', async () => {
    const ANGULAR = {
      'package.json': JSON.stringify({
        name: 'a',
        version: '1.0.0',
        dependencies: { '@angular/core': '20.0.0' },
      }),
      'src/index.html': '<html lang="bg"><head></head><body></body></html>',
    };
    const without = await scopeOf(ANGULAR, 'angular');
    const withFont = await scopeOf(
      { ...ANGULAR, 'src/fonts.css': SPLIT_FONT },
      'angular'
    );
    expect(without.selected).not.toContain(FONT.title);
    expect(withFont.selected).toContain(FONT.title);
    expect(withFont.applicable).toBe(without.applicable + 1);
  });
});
