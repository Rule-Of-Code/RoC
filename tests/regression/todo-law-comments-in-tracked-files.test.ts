/**
 * @fileoverview TODO Management Constitutional Requirements reads TODO
 * markers in comments of tracked files (RoC_web NO-GO on the 8.0.0 rc1).
 *
 * On the site the law counted a "TODO (Sprint N)" inside a JSON string in an
 * HTML <script>, missed a TODO on the second line of a CSS block comment, and
 * read gitignored generated files. Each case is a real git repository.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TodoManagementLaw } from '../../src/laws/documentation/todo-management';
import { TodoManagementStandardsLaw } from '../../src/laws/documentation/todo-management-standards';
import type { LawCheckContext } from '../../src/types/law.types';
import { execFileSync } from '../../src/utils/child-process';

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** A git repository holding `files`; `ignored` files are written and gitignored. */
function repo(
  files: Record<string, string>,
  ignored: Record<string, string> = {}
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-todo-'));
  dirs.push(root);
  const write = (name: string, text: string): void => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  const git = (...args: string[]): void => {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  };
  git('init', '-q');
  write('.gitignore', Object.keys(ignored).join('\n') + '\n');
  for (const [name, text] of Object.entries(files)) write(name, text);
  git('add', '-A');
  for (const [name, text] of Object.entries(ignored)) write(name, text);
  return root;
}

const context = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'node' },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
    },
  }) as unknown as LawCheckContext;

const countIn = async (
  files: Record<string, string>,
  ignored?: Record<string, string>
): Promise<number> => {
  const result = await TodoManagementLaw.check(context(repo(files, ignored)));
  const match = /(\d+) TODOs?/.exec(result.message ?? '');
  return match
    ? Number(match[1])
    : (result.violations?.length ?? 0) > 0
      ? -1
      : 0;
};

describe('TODO markers: comments of tracked files only', () => {
  it('counts a TODO in a TypeScript line comment (control)', async () => {
    expect(
      await countIn({
        'src/a.ts': '// TODO (Sprint 99): ship it\nexport const a = 1;\n',
      })
    ).toBe(1);
  });

  it('does not count TODO text inside a JSON string in an HTML script, nor an #todo anchor', async () => {
    const html = [
      '<a href="#todo">todo</a>',
      '<script>',
      'const DATA = {"laws":[{"d":"TODO (Sprint 3): write it"}],"x":"#todo"};',
      '</script>',
      '',
    ].join('\n');
    expect(await countIn({ 'design/laws.html': html })).toBe(0);
  });

  it('does not count a CSS selector #todo-list', async () => {
    expect(
      await countIn({ 'src/styles.css': '#todo-list { color: red; }\n' })
    ).toBe(0);
  });

  it('counts a TODO on the second line of a CSS block comment', async () => {
    const css = [
      '/* Elevation is a token.',
      '   TODO (Sprint 99): move to generated output */',
      '.card { margin: 0; }',
      '',
    ].join('\n');
    expect(await countIn({ 'src/styles.css': css })).toBe(1);
  });

  it('counts a TODO on the second line of a TS block comment', async () => {
    const ts = [
      '/**',
      ' * Reads the config.',
      ' * TODO (Sprint 99): cache it',
      ' */',
      'export const read = (): number => 1;',
      '',
    ].join('\n');
    expect(await countIn({ 'src/read.ts': ts })).toBe(1);
  });

  it('counts a TODO in an HTML comment', async () => {
    expect(
      await countIn({
        'src/index.html':
          '<!-- TODO (Sprint 99): add the footer -->\n<p>x</p>\n',
      })
    ).toBe(1);
  });

  it('does not read a gitignored file', async () => {
    expect(
      await countIn(
        { 'src/a.ts': 'export const a = 1;\n' },
        { 'src/generated.ts': '// TODO (Sprint 1): generated noise\n' }
      )
    ).toBe(0);
  });
});

describe('TODO Management Standards: tracked files only', () => {
  const standards = async (
    files: Record<string, string>,
    ignored?: Record<string, string>
  ): Promise<string[]> => {
    const result = await TodoManagementStandardsLaw.check(
      context(repo(files, ignored))
    );
    return result.details ?? [];
  };

  it('finds a TODO in a tracked file (control)', async () => {
    const details = await standards({
      'src/a.ts': '// TODO: wire the cache\nexport const a = 1;\n',
    });
    expect(details).not.toContain('No TODO comments found in codebase');
  });

  it('does not read a gitignored file', async () => {
    const details = await standards(
      { 'src/a.ts': 'export const a = 1;\n' },
      { 'src/generated.ts': '// TODO: generated noise\n' }
    );
    expect(details).toContain('No TODO comments found in codebase');
  });
});
