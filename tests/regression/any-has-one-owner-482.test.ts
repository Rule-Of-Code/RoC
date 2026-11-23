/**
 * #482 — one `x as any` was a finding of two laws: Absolute Zero Tolerance
 * Doctrine (error) and No Explicit Any / Non-Null Assertion (warning). One
 * defect, two findings, two suggestions; a report read as twice the problem.
 *
 * Decision: Absolute Zero Tolerance Doctrine, the error-severity gate, owns
 * the `any` written by hand in a declaration or a cast (`: any`, `as any`,
 * `any[]`), as #459 kept it. No Explicit Any no longer counts those again; it
 * keeps what the other law does not judge: `<any>` assertions and type
 * arguments, the weak `Function` / `Object` types, and non-null `!`. Nothing
 * is unblocked: the owner of the overlap is the law that blocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { NoExplicitAnyNonNullLaw } from '../../src/checkers/code-quality-laws/no-explicit-any-non-null';
import { ZeroToleranceStrictLaw } from '../../src/checkers/code-quality-laws/zero-tolerance-strict';
import { FileUtils } from '../../src/utils';

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);

const project = (source: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-482-'));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'p', version: '1.0.0' })
  );
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true } })
  );
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), source);
  return dir;
};

const findings = async (
  law: { check: (c: never) => unknown },
  dir: string
): Promise<string[]> =>
  ((
    (await law.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    } as never)) as { violations?: string[] }
  ).violations ?? []) as string[];

const anyFindings = (all: string[]): string[] =>
  all.filter(v => /`any`|Strict type violations/.test(v));

describe('#482 one `any` is one finding', () => {
  it.each([
    ['as any', 'export const x = JSON.parse("1") as any;\n'],
    ['a : any parameter', 'export function f(v: any): void { void v; }\n'],
    ['an any[] declaration', 'export const list: any[] = [];\n'],
  ])(
    '%s: Absolute Zero Tolerance counts it, No Explicit Any does not',
    async (_l, src) => {
      const dir = project(src);
      expect(
        anyFindings(await findings(ZeroToleranceStrictLaw, dir))
      ).toHaveLength(1);
      expect(anyFindings(await findings(NoExplicitAnyNonNullLaw, dir))).toEqual(
        []
      );
    }
  );

  it('what only No Explicit Any judges is still its finding: <any>, Function, !', async () => {
    const dir = project(
      'export const a = <any>JSON.parse("1");\nexport let cb: Function;\nexport const n = (globalThis as { v?: string }).v!.length;\n'
    );
    const nea = await findings(NoExplicitAnyNonNullLaw, dir);
    expect(nea.some(v => v.startsWith('Explicit `any`/weak type in'))).toBe(
      true
    );
    expect(nea.some(v => v.startsWith('Non-null assertion'))).toBe(true);
  });
});
