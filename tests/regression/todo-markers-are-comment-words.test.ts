/**
 * TODO Management Standards, revived by #369, counted every case-insensitive
 * `TODO|FIXME|HACK|XXX|NOTE` anywhere on any line: on a real site all 66
 * findings were false (`.cov-note {`, `note: true`, "footnote", prose, the
 * law's own name in a JSON string). A marker is now the upper-case word in a
 * comment of the file's language; NOTE is not a task marker.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TodoManagementStandardsLaw } from '../../src/laws/documentation/todo-management-standards';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../src/types/law.types';
import { commentLines } from '../../src/utils/comment-text';

const made: string[] = [];
afterAll(() => {
  for (const dir of made.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

async function lawOn(files: Record<string, string>): Promise<LawResult> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-todo-words-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  const config = {
    laws: {},
    ignores: { global: [] },
    includes: { global: [] },
  } as unknown as RuleOfCodeConfig;
  return TodoManagementStandardsLaw.check({
    projectRoot: root,
    config,
  } as LawCheckContext);
}

const todoCount = (result: LawResult): number => {
  const line = (result.violations ?? [])
    .map(String)
    .find(v => v.includes('TODOs with improper formatting'));
  return line ? Number(line.split(' ')[0]) : 0;
};

describe('TODO Management Standards — not a marker (0)', () => {
  it.each([
    [
      'a CSS class with "note"',
      'src/styles.css',
      '.cov-note b,\n.prompt-note {\n  color: red;\n}\n',
    ],
    [
      'an object key "note"',
      'src/data.ts',
      'export const row = { note: true, todo: false };\n',
    ],
    [
      '"footnote" in a comment',
      'src/hero.css',
      '/* hero footnote — under the title */\n.hero { margin: 0; }\n',
    ],
    [
      'the law name in a JSON string',
      'src/laws.json',
      '{ "title": "TODO Management Standards", "fixme": "TODO: x" }\n',
    ],
    [
      'prose in Markdown',
      'docs/guide.md',
      'Note the line under the heading.\nTODO: this is prose, not a comment.\n',
    ],
    [
      'a marker inside a string',
      'src/example.ts',
      'export const sample = "// TODO looks like this";\n',
    ],
    [
      'the law name in a TS string',
      'src/registry.ts',
      "export const law = { title: 'TODO Management Standards' };\n",
    ],
    [
      'a lower-case or longer word',
      'src/words.ts',
      '// todo later, TODOs elsewhere, TODO_LIST\nexport const a = 1;\n',
    ],
    [
      'a NOTE comment',
      'src/remark.ts',
      '// NOTE: kept for the migration\nexport const a = 1;\n',
    ],
    [
      'a comment that names the word',
      'src/card.css',
      '/* the rare exception — never a "TODO" look */\n.card { margin: 0; }\n',
    ],
  ])('%s → 0', async (_name, file, content) => {
    const result = await lawOn({ [file]: content });
    expect(todoCount(result)).toBe(0);
    expect(result.passed).toBe(true);
  });
});

describe('TODO Management Standards — a marker in a comment (1 each)', () => {
  it.each([
    ['// TODO in TypeScript', 'src/a.ts', '// TODO: x\nexport const a = 1;\n'],
    ['# FIXME in Python', 'app/b.py', '# FIXME y\nx = 1\n'],
    [
      '<!-- TODO --> in HTML',
      'src/c.html',
      '<main>\n  <!-- TODO z -->\n</main>\n',
    ],
    [
      'TODO on a line of a block comment',
      'src/d.ts',
      '/**\n * Loader.\n * TODO: cache the result\n */\nexport const d = 1;\n',
    ],
    [
      'HACK after code',
      'src/e.ts',
      'export const e = 1; // HACK until the API returns ids\n',
    ],
    [
      'TODO in a CSS comment',
      'src/f.css',
      '/* TODO: drop after the redesign */\n.f { color: red; }\n',
    ],
    [
      'a tag inside the comment',
      'src/g.ts',
      '// kept for now; TODO(tokens): move to the generated file\nexport const g = 1;\n',
    ],
  ])('%s → 1', async (_name, file, content) => {
    const result = await lawOn({ [file]: content });
    expect(todoCount(result)).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('a referenced, formatted TODO is counted and passes', async () => {
    const result = await lawOn({
      'src/a.ts': '// TODO (GH-12): split the loader\nexport const a = 1;\n',
    });
    expect(result.passed).toBe(true);
    expect(result.message).not.toContain('No TODOs');
  });
});

describe('commentLines', () => {
  it('reads the comments of each language and nothing else', () => {
    expect(
      commentLines('a.ts', 'const s = "//x"; // real\n/* one\n two */ code')
    ).toEqual([
      { line: 1, text: ' real' },
      { line: 2, text: ' one' },
      { line: 3, text: ' two ' },
    ]);
    expect(commentLines('a.json', '{ "a": "// TODO" }')).toEqual([]);
    expect(commentLines('a.py', "x = '#no'  # yes")).toEqual([
      { line: 1, text: ' yes' },
    ]);
    expect(commentLines('a.html', '<p>TODO</p><!-- c -->')).toEqual([
      { line: 1, text: ' c ' },
    ]);
  });
});
