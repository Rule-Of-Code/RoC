/**
 * #364 — a hosting rewrite pins a serverless region; when the deploy
 * configuration moves the service, the rewrite keeps the old region.
 */
import { HostingRewriteRegionMatchesDeployLaw } from '../../../src/checkers/edge-deploy-laws/hosting-rewrite-region-matches-deploy';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../../src/data/edge-deploy-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = EDGE_DEPLOY_SECURITY_LAWS.find(
  law => law.checkFunction === 'HostingRewriteRegionMatchesDeployLaw.check'
);
const check = (files: Record<string, string>) =>
  HostingRewriteRegionMatchesDeployLaw.check(ctx(project(files)));

const firebase = (region?: string): string =>
  JSON.stringify(
    {
      hosting: {
        public: 'www',
        rewrites: [
          {
            source: '/e/**',
            run: region ? { serviceId: 'api', region } : { serviceId: 'api' },
          },
        ],
      },
    },
    null,
    2
  );

describe('#364 Hosting Rewrite Region Matches Deploy — acceptance', () => {
  it('red: rewrite europe-west1, deploy script europe-west3 for the same service', () => {
    const result = check({
      'firebase.json': firebase('europe-west1'),
      'scripts/deploy.sh':
        'gcloud run deploy api --region europe-west3 --image x\n',
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^firebase\.json:\d+: the rewrite sends traffic to service api in europe-west1, but the repository deploys api to europe-west3 \(scripts\/deploy\.sh:1\)/
      ),
    ]);
  });

  it('green: the same region', () => {
    const result = check({
      'firebase.json': firebase('europe-west3'),
      'scripts/deploy.sh': 'gcloud run deploy api --region=europe-west3\n',
    });
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 rewrite\(s\) compared with the deploy configuration in 1 file\(s\)/
    );
    expect(result.metrics).toMatchObject({ rewrites: 1, judged: 1 });
  });

  it('red: a Cloud Build substitution resolves the region', () => {
    const cloudbuild = [
      'substitutions:',
      '  _RUN_REGION: europe-west3',
      'steps:',
      "- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'",
      '  entrypoint: gcloud',
      "  args: ['run', 'deploy', 'api', '--region', '${_RUN_REGION}']",
      '',
    ].join('\n');
    expect(
      check({
        'firebase.json': firebase('europe-west1'),
        'cloudbuild.yaml': cloudbuild,
      }).violations
    ).toEqual([
      expect.stringContaining(
        'deploys api to europe-west3 (cloudbuild.yaml:6)'
      ),
    ]);
  });

  it('red: an omitted region is us-central1; the deploy-cloudrun action deploys elsewhere', () => {
    const yml =
      'jobs:\n  d:\n    steps:\n      - uses: google-github-actions/deploy-cloudrun@v2\n        with:\n          service: api\n          region: ${{ env.REGION }}\nenv:\n  REGION: europe-west3\n';
    expect(
      check({ 'firebase.json': firebase(), '.github/workflows/d.yml': yml })
        .violations
    ).toEqual([
      expect.stringMatching(
        /service api in us-central1 \(the default when region is omitted\), but the repository deploys api to europe-west3 \(\.github\/workflows\/d\.yml:4\)/
      ),
    ]);
  });

  it('single repository: no deploy of the service, and its region appears in no deploy configuration → a finding', () => {
    const result = check({
      'firebase.json': firebase('europe-west1'),
      'scripts/deploy.sh': 'gcloud run deploy worker --region europe-west3\n',
    });
    expect(result.violations).toEqual([
      expect.stringContaining(
        'a region that appears in no deploy configuration of this repository'
      ),
    ]);
  });

  it('a repository that only hosts (no deploy to compare with) does not select the law', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'firebase.json': firebase('europe-west1') })
      )
    ).toBe(false);
  });

  it('deploys that name no region at all → not judged, never a guess', () => {
    const result = check({
      'firebase.json': firebase('europe-west1'),
      'scripts/deploy.sh': 'gcloud run deploy worker --image x\n',
    });
    expect(result.judgedNothing).toBe(true);
    expect(result.suggestions?.join(' ')).toMatch(
      /no deploy configuration in this repository names a region/
    );
  });

  it('a region that cannot be resolved is a note, never a guess', () => {
    const result = check({
      'firebase.json': firebase('europe-west1'),
      'scripts/deploy.sh': 'gcloud run deploy api --region "$1"\n',
    });
    expect(result.judgedNothing).toBe(true);
  });

  it('red/green: a Cloud Run deterministic URL in vercel.json', () => {
    const vercel = (region: string): string =>
      JSON.stringify({
        rewrites: [
          {
            source: '/api/:p*',
            destination: `https://api-123456789.${region}.run.app/:p*`,
          },
        ],
      });
    const deploy = {
      'scripts/deploy.sh': 'gcloud run deploy api --region europe-west3\n',
    };
    expect(
      check({ 'vercel.json': vercel('europe-west1'), ...deploy }).violations
    ).toEqual([
      expect.stringMatching(/^vercel\.json:1: .*service api in europe-west1/),
    ]);
    expect(
      check({ 'vercel.json': vercel('europe-west3'), ...deploy }).passed
    ).toBe(true);
  });
});

describe('#364 — selection is the subject', () => {
  it('hosting without a run rewrite, and a deploy script alone, do not select the law', () => {
    const root = project({
      'firebase.json': JSON.stringify({
        hosting: { rewrites: [{ source: '**', destination: '/index.html' }] },
      }),
      'scripts/deploy.sh': 'gcloud run deploy api --region x\n',
    });
    expect(lawRequirementsMet(LAW?.requires, root)).toBe(false);
  });

  it('an untracked firebase.json selects and is judged; a git-ignored one selects nothing', () => {
    const files = {
      'firebase.json': firebase('europe-west1'),
      'scripts/deploy.sh': 'gcloud run deploy api --region europe-west3\n',
    };
    const untracked = repo(files, ['scripts/deploy.sh']);
    expect(lawRequirementsMet(LAW?.requires, untracked)).toBe(true);
    expect(
      HostingRewriteRegionMatchesDeployLaw.check(ctx(untracked)).violations
    ).toHaveLength(1);
    const ignored = repo({ ...files, '.gitignore': 'firebase.json\n' }, [
      'scripts/deploy.sh',
      '.gitignore',
    ]);
    expect(lawRequirementsMet(LAW?.requires, ignored)).toBe(false);
  });

  it('a git-ignored deploy script is not evidence: it neither selects the law nor is compared', () => {
    const files = {
      'firebase.json': firebase('europe-west1'),
      'local/deploy.sh': 'gcloud run deploy api --region europe-west3\n',
      '.gitignore': 'local/\n',
    };
    const root = repo(files, ['firebase.json', '.gitignore']);
    expect(lawRequirementsMet(LAW?.requires, root)).toBe(false);
    expect(
      HostingRewriteRegionMatchesDeployLaw.check(ctx(root)).metrics
    ).toMatchObject({ deployCommandsRead: 0 });
  });

  it('a deploy mentioned in a comment does not select it; a package.json script does', () => {
    const rewrite = { 'firebase.json': firebase('europe-west1') };
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          ...rewrite,
          'scripts/d.sh': '# gcloud run deploy api --region x\n',
        })
      )
    ).toBe(false);
    const pkg = {
      ...rewrite,
      'package.json':
        '{ "scripts": { "deploy": "gcloud run deploy api --region europe-west3" } }',
    };
    expect(lawRequirementsMet(LAW?.requires, project(pkg))).toBe(true);
    expect(check(pkg).violations).toEqual([
      expect.stringContaining('deploys api to europe-west3 (package.json:1)'),
    ]);
  });

  it('ignores.global leaves firebase.json out of the gate', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'legacy/firebase.json': firebase('x') }),
        ['legacy/**']
      )
    ).toBe(false);
  });

  it('no file read → judged nothing', () => {
    expect(check({ 'README.md': '#\n' }).judgedNothing).toBe(true);
  });
});
