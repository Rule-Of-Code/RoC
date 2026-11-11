/**
 * NextClientEnvPublicOnly (#219): in the client graph, process.env.X and
 * process.env['X'] name NEXT_PUBLIC_*, NODE_ENV, or a literal next.config env key.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextClientEnvPublicOnlyLaw as Law } from '../../../src/checkers/next-laws/next-client-env-public-only';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>) => Law.check(nextCtx(nextApp(files)));
const CLIENT = 'src/components/Flag.tsx';

describe('NextClientEnvPublicOnlyLaw', () => {
  it('red: dot and bracket forms of a non-public name, also in a module the client imports', () => {
    const result = run({
      [CLIENT]: "'use client';\nimport { url } from '@/lib/config';\nexport const Flag = () => <p>{process.env['FEATURE_X']}{url}</p>;\n",
      'src/lib/config.ts': 'export const url = process.env.API_URL;\n',
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/components\/Flag\.tsx:3: process\.env\['FEATURE_X'\] is read in browser code/),
      expect.stringMatching(/^src\/lib\/config\.ts:1: process\.env\.API_URL is read in browser code \(through src\/components\/Flag\.tsx → src\/lib\/config\.ts\)/),
    ]);
  });

  it('green: NEXT_PUBLIC_*, NODE_ENV and a literal next.config env key', () => {
    const result = run({
      [CLIENT]: "'use client';\nexport const Flag = () => <p>{process.env.NEXT_PUBLIC_A}{process.env['NEXT_PUBLIC_B']}{process.env.NODE_ENV}{process.env.customKey}</p>;\n",
      'next.config.ts': "const nextConfig = { env: { customKey: 'v' } };\nexport default nextConfig;\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('control: a server component may read any variable', () => {
    const result = run({ 'src/app/page.tsx': 'export default function Page() { return <p>{process.env.DATABASE_URL}</p>; }\n' });
    expect(result.violations).toEqual([]);
  });

  it('names a next.config env it could not read', () => {
    const result = run({
      [CLIENT]: "'use client';\nexport const Flag = () => <p>{process.env.customKey}</p>;\n",
      'next.config.ts': 'export default { env: buildEnv() };\n',
    });
    expect(result.violations).toEqual([expect.stringContaining('(the env of next.config.ts is not a literal object and was not read)')]);
  });

  it('fails closed on an unresolved import in the client graph', () => {
    const result = run({ [CLIENT]: "'use client';\nimport { x } from '@/lib/nowhere';\nexport const Flag = () => <p>{x}</p>;\n" });
    expect(result.violations).toEqual([expect.stringContaining("import '@/lib/nowhere' could not be resolved")]);
  });

  it('fails when the parser cannot be loaded', () => {
    const root = nextApp({ [CLIENT]: "'use client';\nexport const Flag = () => <p />;\n" });
    const result = withoutTypeScript(() => Law.check(nextCtx(root)));
    expect(result.violations?.[0]).toMatch(/could not load the 'typescript' package/);
  });

  it('is selected with next only', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextClientEnvPublicOnlyLaw.check');
    expect(card?.defaultSeverity).toBe('error');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'requirements.txt': 'fastapi\n' }))).toBe(false);
  });
});
