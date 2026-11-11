/**
 * NextServerActionAuthorizes (#216): every Server Action — each async export
 * of a 'use server' module and each inline 'use server' function — calls a
 * configured guard before its first statement.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextServerActionAuthorizesLaw as Law } from '../../../src/checkers/next-laws/next-server-action-authorizes';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const GUARDS = { authGuards: ['requireUser'] };
const run = (files: Record<string, string>, next: Record<string, unknown> | null = GUARDS) =>
  Law.check(nextCtx(nextApp(files), next ?? undefined));

describe('NextServerActionAuthorizesLaw — module actions', () => {
  it('red: an exported async action whose first statement is not a guard', () => {
    const result = run({
      'src/app/actions.ts': "'use server';\nexport async function deletePost(id: string) {\n  await db.delete(id);\n  await requireUser();\n}\n",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/actions\.ts:2: Server Action 'deletePost' does not call a guard \(requireUser\)/),
    ]);
  });

  it('green: the guard is the first statement (also as `const user = await auth.requireUser()`)', () => {
    const result = run({
      'src/app/actions.ts': [
        "'use server';",
        'export async function a(id: string) { await requireUser(); return id; }',
        'export const b = async () => { const user = await auth.requireUser(); return user; };',
        'export default async function c() { await requireUser(); }',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('red: arrow, default and `export { x as y }` forms are all read', () => {
    const result = run({
      'src/app/actions.ts': [
        "'use server';",
        'export const a = async () => { return 1; };',
        'export default async function () { return 2; }',
        'async function hidden() { return 3; }',
        'export { hidden as c };',
      ].join('\n'),
    });
    expect(result.violations).toHaveLength(3);
    expect(result.violations?.join('\n')).toMatch(/'a'.*\n.*'default'.*\n.*'c'/);
  });

  it('green: a wrapper named in authGuards; red: a builder that is not', () => {
    const files = {
      'src/app/actions.ts': [
        "'use server';",
        'export const ok = authClient.schema(s).action(async ({ input }) => input);',
        'export const bad = actionClient.action(async ({ input }) => input);',
      ].join('\n'),
    };
    const result = run(files, { authGuards: ['authClient'] });
    expect(result.violations).toEqual([expect.stringContaining("Server Action 'bad' does not call a guard")]);
  });

  it('red: a re-export cannot be read and is reported', () => {
    const result = run({ 'src/app/actions.ts': "'use server';\nexport { deletePost } from './impl';\n" });
    expect(result.violations).toEqual([expect.stringContaining("is re-exported from './impl'")]);
  });

  it('red: an empty action is still a public endpoint', () => {
    const result = run({ 'src/app/actions.ts': "'use server';\nexport async function noop() {}\n" });
    expect(result.violations).toEqual([expect.stringContaining('empty body')]);
  });

  it('control: a module without the directive is not an action module', () => {
    const result = run({ 'src/lib/util.ts': 'export async function helper() { return 1; }\n' });
    expect(result.violations).toEqual([]);
  });
});

describe('NextServerActionAuthorizesLaw — inline actions', () => {
  it('red/green: an inline \'use server\' function in a Server Component', () => {
    const red = run({
      'src/app/page.tsx': "export default function Page() {\n  async function save() {\n    'use server';\n    await db.save();\n  }\n  return <form action={save} />;\n}\n",
    });
    expect(red.violations).toEqual([expect.stringMatching(/^src\/app\/page\.tsx:2: Server Action 'save'/)]);
    const green = run({
      'src/app/page.tsx': "export default function Page() {\n  async function save() {\n    'use server';\n    await requireUser();\n    await db.save();\n  }\n  return <form action={save} />;\n}\n",
    });
    expect(green.violations).toEqual([]);
  });
});

describe('NextServerActionAuthorizesLaw — fail closed', () => {
  it('fails when actions exist and thresholds.next.authGuards is not declared', () => {
    const result = run({ 'src/app/actions.ts': "'use server';\nexport async function a() { await requireUser(); }\n" }, null);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/1 Server Action\(s\) .* and no thresholds\.next\.authGuards/)]);
  });

  it('fails on a malformed authGuards', () => {
    const result = run({ 'src/app/actions.ts': "'use server';\nexport async function a() {}\n" }, { authGuards: 'requireUser' });
    expect(result.violations).toEqual(['thresholds.next.authGuards must be a list of non-empty names']);
  });

  it('fails, naming the files, when the parser cannot be loaded', () => {
    const root = nextApp({ 'src/app/actions.ts': "'use server';\nexport async function a() {}\n" });
    const result = withoutTypeScript(() => Law.check(nextCtx(root, GUARDS)));
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/file\(s\): could not load the 'typescript' package/);
  });
});

describe('NextServerActionAuthorizesLaw selection', () => {
  const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextServerActionAuthorizesLaw.check');

  it('is selected where next is declared, not in a React-only or Python project', () => {
    expect(card?.defaultSeverity).toBe('error');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19.0.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': '[project]\nname = "x"\n' }))).toBe(false);
  });
});
