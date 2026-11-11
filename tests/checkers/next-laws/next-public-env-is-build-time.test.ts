/**
 * NextPublicEnvIsBuildTime (#200): NEXT_PUBLIC_* is declared where next build
 * runs (rule 1), never read through a computed key in browser code (rule 2),
 * and never named like a secret without a reason (rule 3).
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextPublicEnvIsBuildTimeLaw as Law } from '../../../src/checkers/next-laws/next-public-env-is-build-time';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>, next?: Record<string, unknown>) => Law.check(nextCtx(nextApp(files), next));
const READ = { 'src/app/page.tsx': 'export default function Page() { return <p>{process.env.NEXT_PUBLIC_API_URL}</p>; }\n' };
const dockerfile = (args: string): string =>
  ['FROM node:22 AS deps', 'ARG NEXT_PUBLIC_API_URL', 'RUN npm ci', 'FROM node:22 AS builder', args, 'RUN npm run build', 'FROM node:22', 'COPY --from=builder /app/.next ./.next'].join('\n');

describe('NextPublicEnvIsBuildTimeLaw — rule 1: declared at build', () => {
  it('red: the Dockerfile stage that builds lacks the ARG (an ARG in another stage does not carry over)', () => {
    const result = run({ ...READ, Dockerfile: dockerfile('ENV NODE_ENV=production') });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/^Dockerfile:6: builds Next without NEXT_PUBLIC_API_URL/)]);
  });

  it('green: ARG (or ENV) in the building stage, before the build', () => {
    expect(run({ ...READ, Dockerfile: dockerfile('ARG NEXT_PUBLIC_API_URL') }).violations).toEqual([]);
    expect(run({ ...READ, Dockerfile: dockerfile('ENV NEXT_PUBLIC_API_URL=https://api') }).violations).toEqual([]);
  });

  it('green: a committed .env.production declares it for every build', () => {
    expect(run({ ...READ, Dockerfile: dockerfile(''), '.env.production': 'NEXT_PUBLIC_API_URL=https://api\n' }).violations).toEqual([]);
  });

  it('red/green: a CI build is read when no Dockerfile builds', () => {
    const ci = (env: string): string => `jobs:\n  build:\n    steps:\n      - run: npx next build\n        env:\n${env}`;
    expect(run({ ...READ, '.github/workflows/ci.yml': ci('          OTHER: 1\n') }).violations).toEqual([
      expect.stringMatching(/^\.github\/workflows\/ci\.yml: builds Next without NEXT_PUBLIC_API_URL/),
    ]);
    expect(run({ ...READ, '.github/workflows/ci.yml': ci('          NEXT_PUBLIC_API_URL: ${{ vars.API }}\n') }).violations).toEqual([]);
  });

  it('fails closed when no build is found, unless the source is declared', () => {
    expect(run(READ).violations).toEqual([expect.stringContaining('no Dockerfile or CI file here runs next build')]);
    expect(run(READ, { publicEnvBuildSource: 'hosting dashboard, production environment' }).violations).toEqual([]);
  });

  it('control: no NEXT_PUBLIC_ read, nothing to declare', () => {
    expect(run({ 'src/app/page.tsx': 'export default () => null;\n' }).violations).toEqual([]);
  });
});

describe('NextPublicEnvIsBuildTimeLaw — rule 2: computed access in browser code', () => {
  it('red: process.env[name] and a destructured process.env in a client graph module', () => {
    const result = run(
      { 'src/components/A.tsx': "'use client';\nconst name = 'NEXT_PUBLIC_A';\nconst { NEXT_PUBLIC_B } = process.env;\nexport const A = () => <p>{process.env[name]}{NEXT_PUBLIC_B}</p>;\n" },
      { publicEnvBuildSource: 'dashboard' }
    );
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/components\/A\.tsx:3: .*never inlined/),
      expect.stringMatching(/^src\/components\/A\.tsx:4: process\.env\[name\] — computed/),
    ]);
  });

  it('control: computed access on the server is not this rule', () => {
    const result = run({ 'src/app/page.tsx': "export default () => <p>{process.env['X' + 1]}</p>;\n" });
    expect(result.violations).toEqual([]);
  });
});

describe('NextPublicEnvIsBuildTimeLaw — rule 3: secret-looking names', () => {
  it('red: a NEXT_PUBLIC_ name containing KEY/SECRET, from code and from the Dockerfile', () => {
    const result = run(
      {
        'src/app/page.tsx': 'export default () => <p>{process.env.NEXT_PUBLIC_STRIPE_KEY}</p>;\n',
        Dockerfile: dockerfile('ARG NEXT_PUBLIC_STRIPE_KEY\nARG NEXT_PUBLIC_API_SECRET'),
      },
      { publicEnvAllowed: [{ name: 'NEXT_PUBLIC_STRIPE_KEY', reason: 'publishable key' }] }
    );
    expect(result.violations).toEqual([expect.stringMatching(/^NEXT_PUBLIC_API_SECRET: a NEXT_PUBLIC_ name containing SECRET/)]);
  });

  it('red: an allowance without a reason is refused', () => {
    const result = run({}, { publicEnvAllowed: [{ name: 'NEXT_PUBLIC_X_KEY' }] });
    expect(result.violations).toEqual([expect.stringContaining('publicEnvAllowed[0] needs a non-empty name and a non-empty reason')]);
  });
});

describe('NextPublicEnvIsBuildTimeLaw — cannot read', () => {
  it('fails when the parser cannot be loaded', () => {
    const root = nextApp(READ);
    const result = withoutTypeScript(() => Law.check(nextCtx(root, { publicEnvBuildSource: 'x' })));
    expect(result.violations).toEqual([expect.stringMatching(/could not load the 'typescript' package/)]);
  });

  it('is selected with next only', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextPublicEnvIsBuildTimeLaw.check');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': '' }))).toBe(false);
  });
});
