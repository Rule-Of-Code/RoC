import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NoDoubleCastLaw } from '../../src/checkers/code-quality-laws/no-double-cast';
import { NoExplicitAnyNonNullLaw } from '../../src/checkers/code-quality-laws/no-explicit-any-non-null';
import { TypedHttpBoundariesLaw } from '../../src/checkers/code-quality-laws/typed-http-boundaries';
import { FileUtils } from '../../src/utils';
import type { LawResult } from '../../src/types/law.types';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * No Explicit Any / Non-Null, No Double Cast and Typed HTTP Boundaries judge
 * code, not text (#424).
 *
 * All three stripped comments only. A string holding `'AWS::Serverless::Function'`
 * was a weak `: Function` type, a law's prose "as unknown as" was a double
 * cast, and `{ keys: Object.keys(x) }` was a weak `: Object` type.
 */
describe('the type-safety laws read code (#424)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const run = (law: {
    check: (c: Parameters<typeof NoDoubleCastLaw.check>[0]) => LawResult;
  }): string[] =>
    law.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'x',
    }).violations ?? [];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-types-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('No Explicit Any / Non-Null Assertion', () => {
    it.each([
      [
        'a type name in a string',
        "export const RESOURCE = 'AWS::Serverless::Function';\nexport const LABEL = 'value: any';\n",
      ],
      [
        'a value after a colon',
        'export const s = { keys: Object.keys({}), make: Function("return 1") };\n',
      ],
      ['an exclamation in a string', "export const HELLO = 'run it! now';\n"],
    ])('does not report %s', (_name, source) => {
      write('src/subject.ts', source);

      expect(run(NoExplicitAnyNonNullLaw)).toEqual([]);
    });

    it.each([
      [
        // `: any` is owned by Absolute Zero Tolerance (#482)
        'an any type argument',
        'export const risky = JSON.parse("{}") as Array<any>;\n',
        'Explicit `any`',
      ],
      [
        'a weak Object type',
        'export function f(o: Object): void { void o; }\n',
        'Explicit `any`',
      ],
      [
        'a non-null assertion',
        'export const n = (m: Map<string, number>) => m.get("a")!.toFixed();\n',
        'Non-null',
      ],
    ])('still reports %s', (_name, source, finding) => {
      write('src/subject.ts', source);

      expect(run(NoExplicitAnyNonNullLaw)).toEqual([
        expect.stringContaining(finding),
      ]);
    });
  });

  describe('No Double Cast', () => {
    it('does not report the words in a string', () => {
      write(
        'src/subject.ts',
        "export const RULE = 'Forbids `as unknown as T` double casts';\n"
      );

      expect(run(NoDoubleCastLaw)).toEqual([]);
    });

    it('still reports a double cast in code', () => {
      write(
        'src/subject.ts',
        'export const n = ("1" as unknown as number) + 1;\n'
      );

      expect(run(NoDoubleCastLaw)).toEqual([
        expect.stringContaining(
          'Double cast (as unknown as) in src/subject.ts'
        ),
      ]);
    });
  });

  describe('Typed HTTP Boundaries', () => {
    it('does not report a call written in a string', () => {
      write(
        'src/subject.ts',
        "export const RULE = 'Requires a generic on http.get(url) calls';\n"
      );

      expect(run(TypedHttpBoundariesLaw)).toEqual([]);
    });

    it('still reports an untyped call in code', () => {
      write(
        'src/subject.ts',
        'export const load = (http: { get: (u: string) => unknown }) => http.get("/x");\n'
      );

      expect(run(TypedHttpBoundariesLaw)).toEqual([
        expect.stringContaining('Untyped HttpClient call(s) in src/subject.ts'),
      ]);
    });
  });

  it('all three say the files were not read without the parser', () => {
    write('src/a.ts', 'export const a = 1;\n');
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      for (const law of [
        NoExplicitAnyNonNullLaw,
        NoDoubleCastLaw,
        TypedHttpBoundariesLaw,
      ]) {
        expect(run(law)[0]).toMatch(
          /the 1 \.ts file\(s\) were NOT read.*judged nothing/
        );
      }
    } finally {
      spy.mockRestore();
    }
  });
});
