import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ZeroToleranceStrictLaw } from '../../src/checkers/code-quality-laws/zero-tolerance-strict';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Absolute Zero Tolerance judges code, not text (#424), and a command-line
 * program's console output is its product (#425).
 *
 * The checks ran regexes over the raw file: a `console.log` in a message, an
 * `any` in a comment's prose, a `TODO` in a regex or in a sentence about the
 * TODO law, an `eslint-disable` in a string — all were findings. In a package
 * that declares a `bin`, console.log/info are the command's output, and in the
 * command's entry modules (what `bin` points to, and its command directory)
 * console.warn/error are too. `unknown[]`
 * was reported as a strict-type violation, and so was the `any[]` rest
 * parameter TypeScript requires of a mixin constructor.
 */
describe('Absolute Zero Tolerance reads code (#424, #425)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /** The findings that name `src/<name>`. */
  const findingsFor = (name: string): string[] => {
    const result = ZeroToleranceStrictLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'absolute-zero-tolerance-doctrine',
    });
    return (result.violations ?? []).filter(v => v.includes(`src/${name}`));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-azt-'));
    write('package.json', '{"name":"lib","version":"1.0.0"}');
    write('tsconfig.json', '{"compilerOptions":{"strict":true}}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('text that is not code is not judged', () => {
    it.each([
      [
        'console.log in a string',
        "export const HELP = 'remove the console.log(x) call';\n",
      ],
      [
        'console.log in a comment',
        '// console.log(x) was removed here\nexport const x = 1;\n',
      ],
      [
        'any in a comment',
        '// Boundary: any Node process.\nexport const x = 1;\n',
      ],
      ['any in a string', "export const MSG = 'value: any is not allowed';\n"],
      [
        'a TODO in a string and a regex',
        "export const EXAMPLE = '// TODO: like this';\nexport const TAG = /\\/\\/ TODO/;\n",
      ],
      [
        'the word TODO in a sentence',
        '// the TODO law reads these markers\nexport const x = 1;\n',
      ],
      ['a lower-case todo', '// todo list rendering\nexport const x = 1;\n'],
      [
        'eslint-disable in a string',
        "export const HINT = '// eslint-disable-next-line';\n",
      ],
      [
        'unknown[]',
        'export function size(items: unknown[]): number { return items.length; }\n',
      ],
      [
        'the any[] rest parameter of a mixin constructor',
        'type Ctor = new (...args: any[]) => object;\nexport function Mixin<T extends Ctor>(Base: T) {\n  return class extends Base {\n    constructor(...args: any[]) { super(...args); }\n  };\n}\n',
      ],
    ])('%s', (_name, source) => {
      write('src/subject.ts', source);

      expect(findingsFor('subject.ts')).toEqual([]);
    });
  });

  describe('code is still judged', () => {
    it.each([
      [
        'console.log',
        'export function f(x: number) { console.log(x); }\n',
        'Console statements',
      ],
      [
        'an any annotation',
        'export function f(x: any) { return x; }\n',
        'Strict type violations',
      ],
      [
        'an as-any cast',
        'export const f = (x: unknown) => (x as any).id;\n',
        'Strict type violations',
      ],
      [
        'a TODO tag',
        '// TODO: remove after the migration\nexport const x = 1;\n',
        'TODO/FIXME',
      ],
      [
        'an eslint-disable comment',
        '// eslint-disable-next-line\nexport const x = 1;\n',
        'ESLint rules disabled',
      ],
      [
        'an empty catch',
        'export function f() { try { g(); } catch (e) {} }\ndeclare function g(): void;\n',
        'Empty catch',
      ],
    ])('%s', (_name, source, finding) => {
      write('src/subject.ts', source);

      expect(findingsFor('subject.ts')).toEqual([
        expect.stringContaining(finding),
      ]);
    });
  });

  describe('a package that declares a bin prints to the console', () => {
    beforeEach(() => {
      write(
        'package.json',
        '{"name":"tool","version":"1.0.0","bin":{"tool":"dist/cli.js"}}'
      );
    });

    it('does not count log and info: they are the output', () => {
      write(
        'src/report.ts',
        "export function report(n: number) {\n  console.log(`${n} files`);\n  console.info('done');\n}\n"
      );

      expect(findingsFor('report.ts')).toEqual([]);
    });

    /**
     * Library code the command calls is not the command: a warning written
     * there bypasses whatever reports to the user, and is counted.
     */
    it('counts warn in a library file of the package', () => {
      write(
        'src/utils/cache.ts',
        "export function save(ok: boolean) {\n  console.log('saved');\n  if (!ok) console.warn('[DEBUG] cache write failed');\n}\n"
      );

      expect(findingsFor('utils/cache.ts')).toEqual([
        'Console statements found in src/utils/cache.ts: 1 occurrences',
      ]);
    });

    /** dist/cli.js is built from src/cli.ts; its commands live in src/cli/. */
    it('does not count warn in the entry module and its commands', () => {
      write(
        'src/cli.ts',
        "export function main() {\n  console.warn('deprecated flag');\n}\n"
      );
      write(
        'src/cli/audit.ts',
        "export function audit(ok: boolean) {\n  if (!ok) console.warn('audit failed');\n}\n"
      );

      expect(findingsFor('cli.ts')).toEqual([]);
      expect(findingsFor('cli/audit.ts')).toEqual([]);
    });

    it('still counts debug and trace', () => {
      write(
        'src/report.ts',
        "export function report(n: number) {\n  console.log(n);\n  console.debug('state', n);\n}\n"
      );

      expect(findingsFor('report.ts')).toEqual([
        'Console statements found in src/report.ts: 1 occurrences',
      ]);
    });
  });

  /** The red control: without a `bin` the same warn is counted. */
  it('counts warn outside a package that declares a bin', () => {
    write(
      'src/utils/cache.ts',
      "export function save(ok: boolean) {\n  if (!ok) console.warn('cache write failed');\n  if (!ok) console.error('cache lost');\n}\n"
    );

    expect(findingsFor('utils/cache.ts')).toEqual([
      'Console statements found in src/utils/cache.ts: 1 occurrences',
    ]);
  });

  it('counts `as any` casts and `: any` annotations together', () => {
    write(
      'src/subject.ts',
      'export function f(y: any) { return (y as any).id + (y as any[]).length; }\n'
    );

    expect(findingsFor('subject.ts')).toEqual([
      'Strict type violations in src/subject.ts: 3 occurrences',
    ]);
  });

  it('does not count console output in the logging module itself', () => {
    write(
      'src/logger.ts',
      'export const logger = { info: (m: string) => console.info(m) };\n'
    );

    expect(findingsFor('logger.ts')).toEqual([]);
  });

  it('says the files were not read without the parser', () => {
    write('src/a.ts', 'export const a = 1;\n');
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = ZeroToleranceStrictLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
        lawId: 'absolute-zero-tolerance-doctrine',
      });

      expect(result.passed).toBe(false);
      expect(result.violations?.[0]).toMatch(
        /\.ts file\(s\) were NOT read.*judged nothing/
      );
    } finally {
      spy.mockRestore();
    }
  });
});
