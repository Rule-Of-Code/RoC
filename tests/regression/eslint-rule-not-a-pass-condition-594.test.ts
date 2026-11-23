/**
 * #594 — Magic Number Prevention and Code Complexity Control required an
 * ESLint rule that contradicts their own definition.
 *
 * Magic Number Prevention counts the fallback of `??`, a constant expression
 * in an initializer and the elements of a `new Set` that initialises a
 * constant as named; ESLint's `no-magic-numbers` has no option for those and
 * reports them. Code Complexity Control does not count `??`, optional
 * chaining or default parameters; ESLint's `complexity` does. Both laws still
 * failed a project for not setting the rule.
 *
 * The law is the check: the rule is not a condition to pass. When the project
 * sets it, the result says so in `details`, as information, and the verdict
 * is the same with or without it.
 */
import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import type { LawResult } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

const project = useTempProject();
const { write } = project;

const PKG = json({
  name: 'p',
  version: '1.0.0',
  devDependencies: { eslint: '9.0.0', typescript: '5.9.3' },
});

const strip = (result: LawResult) => ({
  passed: result.passed,
  violations: result.violations ?? [],
  notRead: result.notRead,
});

describe('#594 Magic Number Prevention does not require no-magic-numbers', () => {
  const run = (): LawResult =>
    MagicNumberPreventionLaw.check(project.context());
  const NAMED = [
    'const LIMIT = 42;',
    'const DAY_MS = 24 * 60 * 60 * 1000;',
    'const STATUSES = new Set([401, 403]);',
    'export function f(limit?: number): number {',
    '  return (limit ?? 80) + LIMIT + DAY_MS + STATUSES.size;',
    '}',
    '',
  ].join('\n');
  const BARE = 'export function g(n: number): number {\n  return n * 42;\n}\n';

  it('numbers named by the law, no ESLint rule: passes, no finding', () => {
    write('package.json', PKG);
    write('.eslintrc.json', json({ rules: { 'no-console': 'error' } }));
    write('src/a.ts', NAMED);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.details).toBeUndefined();
  });

  it('the same project with the rule: same verdict, the rule named as information', () => {
    write('package.json', PKG);
    write('.eslintrc.json', json({ rules: { 'no-magic-numbers': 'warn' } }));
    write('src/a.ts', NAMED);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.details).toEqual([
      '.eslintrc.json sets no-magic-numbers — information only: this law reads the literals itself and does not require the rule',
    ]);
  });

  it('a real magic number still fails, with or without the rule', () => {
    write('package.json', PKG);
    write('src/b.ts', BARE);
    write('.eslintrc.json', json({ rules: {} }));
    const without = strip(run());
    write(
      '.eslintrc.json',
      json({ rules: { '@typescript-eslint/no-magic-numbers': 'error' } })
    );
    const withRule = strip(run());
    expect(without.passed).toBe(false);
    expect(without.violations).toEqual([
      expect.stringMatching(/^Magic numbers in src\/b\.ts: .*42/),
    ]);
    expect(withRule).toEqual(without);
  });

  it('an ESLint config it cannot read changes nothing: no note, no finding', () => {
    write('package.json', PKG);
    write('.eslintrc.js', 'module.exports = { rules: {} };\n');
    write('src/a.ts', NAMED);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.notRead).toBeUndefined();
    expect(result.passed).toBe(true);
  });
});

describe('#594 Code Complexity Control does not require ESLint complexity rules', () => {
  const run = (): LawResult =>
    CodeComplexityControlLaw.check(project.context());
  const SIMPLE =
    'export function h(a?: { b?: number }, c = 1): number {\n  return (a?.b ?? 0) + c;\n}\n';
  /** Eleven `if`s: decision points 11, complexity 12 > 10. */
  const COMPLEX = [
    'export function k(n: number): number {',
    '  let s = 0;',
    ...Array.from({ length: 11 }, (_, i) => `  if (n > ${i}) s++;`),
    '  return s;',
    '}',
    '',
  ].join('\n');

  it('simple code, no complexity rule: passes, no finding', () => {
    write('package.json', PKG);
    write('.eslintrc.json', json({ rules: { 'no-console': 'error' } }));
    write('src/a.ts', SIMPLE);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.details).toBeUndefined();
  });

  it('the same project with the rules: same verdict, the rules named as information', () => {
    write('package.json', PKG);
    write(
      '.eslintrc.json',
      json({ rules: { complexity: ['error', 10], 'max-depth': ['error', 4] } })
    );
    write('src/a.ts', SIMPLE);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.details).toEqual([
      expect.stringMatching(
        /^\.eslintrc\.json sets complexity, max-depth — information only: this law measures each function itself/
      ),
    ]);
  });

  it('a too complex function still fails, with or without the rule', () => {
    write('package.json', PKG);
    write('src/c.ts', COMPLEX);
    write('.eslintrc.json', json({ rules: {} }));
    const without = strip(run());
    write('.eslintrc.json', json({ rules: { complexity: ['error', 10] } }));
    const withRule = strip(run());
    expect(without.passed).toBe(false);
    expect(without.violations).toEqual([
      expect.stringMatching(/^Function complexity too high in src\/c\.ts/),
    ]);
    expect(withRule).toEqual(without);
  });

  it('an ESLint config it cannot read changes nothing: no note, no finding', () => {
    write('package.json', PKG);
    write('eslint.config.cjs', 'module.exports = [];\n');
    write('src/a.ts', SIMPLE);
    const result = run();
    expect(result.violations).toEqual([]);
    expect(result.notRead).toBeUndefined();
    expect(result.passed).toBe(true);
  });
});
