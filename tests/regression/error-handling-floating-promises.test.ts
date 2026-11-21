/**
 * #438 — Error Handling Completeness flagged a file when `await \w+` occurred
 * more than four times per `try {`/`.catch(` in the raw text, counted `.then(`
 * and `fetch(` in strings and comments, and looked for a global handler only
 * in fixed file names, never in what package.json `bin`/`main` name.
 *
 * Now an await is not a gap (its rejection goes to the enclosing try or the
 * caller); a DROPPED promise is — a `.then` chain or a call to an async
 * function of the file used as a statement, neither awaited, returned,
 * `void`-ed nor caught. Code is read from the parse, and the package's entry
 * points are read from source.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ErrorHandlingCompletenessLaw } from '../../src/checkers/code-quality-laws/error-handling-completeness';
import { FileUtils } from '../../src/utils/file-utils';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function run(
  files: Record<string, string>,
  manifest: Record<string, unknown> = {}
): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-438-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'eh-438', version: '1.0.0', ...manifest })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return (
    ErrorHandlingCompletenessLaw.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    }).violations ?? []
  );
}

/** The per-file gaps reported for src/app.ts. */
function gaps(source: string): string[] {
  return run({ 'src/app.ts': source }).filter(v =>
    v.startsWith('Error handling gaps')
  );
}

const awaits = (n: number): string =>
  Array.from({ length: n }, (_, i) => `  const r${i} = await load(${i});`).join(
    '\n'
  );

describe('#438 an await is not a gap', () => {
  it('five awaits inside one try', () => {
    expect(
      gaps(
        [
          'declare function load(n: number): Promise<number>;',
          'export async function all(): Promise<void> {',
          '  try {',
          awaits(5),
          '  } catch (e) {',
          '    throw new Error(String(e));',
          '  }',
          '}',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it('awaits with no local try: the rejection goes to the caller', () => {
    expect(
      gaps(
        [
          'declare function load(n: number): Promise<number>;',
          'export async function all(): Promise<void> {',
          awaits(6),
          '}',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });
});

describe('#438 code is read from the parse', () => {
  it('.then( and fetch( in strings, a regex and comments are not code', () => {
    expect(
      gaps(
        [
          "// fetch('/x').then(render)",
          "export const tip = 'call fetch(url).then(r => r.json())';",
          'export const re = /\\.then\\(/g;',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });
});

describe('#438 a dropped promise is a gap', () => {
  it('a .then chain used as a statement, though .catch( appears elsewhere', () => {
    const v = gaps(
      [
        'declare function a(): Promise<number>;',
        'declare function b(): Promise<number>;',
        'export function go(): void {',
        '  a().then(n => n + 1);',
        '  b().catch(() => 0);',
        '}',
        '',
      ].join('\n')
    );
    expect(v).toEqual([
      expect.stringContaining(
        '1 promise(s) neither awaited, returned nor caught (line 4)'
      ),
    ]);
  });

  it('a call to an async function of the file, used as a statement', () => {
    const v = gaps(
      [
        'async function save(): Promise<void> {}',
        'export class Store {',
        '  async flush(): Promise<void> {}',
        '  run(): void {',
        '    save();',
        '    this.flush();',
        '  }',
        '}',
        '',
      ].join('\n')
    );
    expect(v).toEqual([
      expect.stringContaining(
        '2 promise(s) neither awaited, returned nor caught (line 5, 6)'
      ),
    ]);
  });

  it('awaited, returned, void-ed or caught is handled (control)', () => {
    expect(
      gaps(
        [
          'async function save(): Promise<void> {}',
          'export async function a(): Promise<void> { await save(); }',
          'export function b(): Promise<void> { return save(); }',
          'export function c(): void { void save(); }',
          'export function d(): void { save().catch(() => undefined); }',
          'export function e(): void { save().then(() => 1, () => 0); }',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });
});

describe('#438 the global handler is looked for in the package entry points', () => {
  const handler = [
    "process.on('unhandledRejection', reason => {",
    "  process.stderr.write(String(reason) + '\\n');",
    '  process.exit(1);',
    '});',
    '',
  ].join('\n');

  it('bin dist/cli.js is read as src/cli.ts', () => {
    expect(
      run({ 'src/cli.ts': handler }, { bin: { tool: 'dist/cli.js' } })
    ).not.toContain('No global error handling configured');
  });

  it('without a handler anywhere it is still reported (control)', () => {
    expect(
      run(
        { 'src/cli.ts': 'export const x = 1;\n' },
        { bin: { tool: 'dist/cli.js' } }
      )
    ).toContain('No global error handling configured');
  });
});

describe('#438 the global handler is recognised in the code, not by name', () => {
  const NO_HANDLER = 'No global error handling configured';
  const cli = (source: string): string[] =>
    run({ 'src/cli.ts': source }, { bin: { tool: 'dist/cli.js' } });

  it('a function named setupErrorHandlers with no try and no handler is not one', () => {
    expect(
      cli(
        [
          'export function setupErrorHandlers(): void {',
          "  process.stdout.on('error', () => undefined);",
          '}',
          'setupErrorHandlers();',
          "process.on('SIGINT', () => process.exit(130));",
          '// unhandledRejection is handled elsewhere',
          '',
        ].join('\n')
      )
    ).toContain(NO_HANDLER);
  });

  it('parseAsync inside a try with a catch, in the bin entry, is one', () => {
    expect(
      cli(
        [
          'declare const program: { parseAsync(): Promise<void> };',
          'async function main(): Promise<void> {',
          '  try {',
          '    await program.parseAsync();',
          '  } catch (err) {',
          '    process.stderr.write(String(err));',
          '    process.exitCode = 1;',
          '  }',
          '}',
          'void main();',
          '',
        ].join('\n')
      )
    ).not.toContain(NO_HANDLER);
  });

  it("process.on('unhandledRejection') in the bin entry is one", () => {
    expect(
      cli(
        [
          "process.on('unhandledRejection', reason => {",
          '  process.stderr.write(String(reason));',
          '  process.exit(1);',
          '});',
          '',
        ].join('\n')
      )
    ).not.toContain(NO_HANDLER);
  });
});
