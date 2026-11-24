/**
 * #506 — Zero Tolerance Doctrine reported `noImplicitAny not enabled` for a
 * tsconfig that sets `"strict": true` and does not repeat the flag.
 *
 * `strict` turns `noImplicitAny` on (TypeScript's own rule), so the finding
 * was false. The flag counts as enabled when it is `true`, or when it is unset
 * and `strict` is `true`. Only an explicit `"noImplicitAny": false` (or no
 * strict at all) is reported.
 */
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
import { readsPartly, saysJudgedNothing } from '../../src/utils/judged-nothing';
import { json, useTempProject } from './foreign-json-486.helpers';

const project = useTempProject();
const { write } = project;
const violations = (): string[] =>
  (ZeroToleranceLaw.check(project.context()).violations ?? []) as string[];

const NO_IMPLICIT_ANY_OFF = 'TypeScript noImplicitAny not enabled';

describe('#506 strict implies noImplicitAny', () => {
  it('strict: true and no noImplicitAny: no finding', () => {
    write('tsconfig.json', json({ compilerOptions: { strict: true } }));
    write('.eslintrc.json', json({ rules: {} }));
    expect(violations()).toEqual([]);
  });

  it('strict: true from a base config it extends: no finding', () => {
    write('tsconfig.base.json', json({ compilerOptions: { strict: true } }));
    write('tsconfig.json', json({ extends: './tsconfig.base.json' }));
    write('.eslintrc.json', json({ rules: {} }));
    expect(violations()).toEqual([]);
  });

  it('strict: true with an explicit noImplicitAny: false: still a finding', () => {
    write(
      'tsconfig.json',
      json({ compilerOptions: { strict: true, noImplicitAny: false } })
    );
    write('.eslintrc.json', json({ rules: {} }));
    expect(violations()).toEqual([NO_IMPLICIT_ANY_OFF]);
  });

  it('no strict and no noImplicitAny: both findings, as before', () => {
    write('tsconfig.json', json({ compilerOptions: {} }));
    write('.eslintrc.json', json({ rules: {} }));
    expect(violations()).toEqual([
      'TypeScript strict mode not enabled',
      NO_IMPLICIT_ANY_OFF,
    ]);
  });
});

/**
 * QA on #578: `strict: true` implies noImplicitAny only when every file of the
 * `extends` chain was read. A base that could not be read may set
 * `noImplicitAny: false`, which `strict: true` in the file does not undo; the
 * law passed it in silence. It is NOT read, in `notRead` (#453): not a
 * finding, not passed, and no claim that the flag is on or off.
 */
describe('#506 with an extends link that could not be read', () => {
  const MISSING = './tsconfig.missing.json';
  const run = () => ZeroToleranceLaw.check(project.context());

  it('strict: true and no noImplicitAny: noImplicitAny is NOT read', () => {
    write(
      'tsconfig.json',
      json({ extends: MISSING, compilerOptions: { strict: true } })
    );
    write('.eslintrc.json', json({ rules: {} }));
    const result = run();
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead).toEqual([
      `tsconfig.json extends "${MISSING}", which could not be read — noImplicitAny was NOT read`,
    ]);
    expect(result.passed).toBe(false);
    expect(readsPartly(result)).toBe(true);
    expect(saysJudgedNothing(result)).toBe(false);
    expect(result.suggestions ?? []).not.toContain(
      'Enable TypeScript strict mode'
    );
  });

  it('no strict and no noImplicitAny: both are NOT read', () => {
    write('tsconfig.json', json({ extends: MISSING, compilerOptions: {} }));
    write('.eslintrc.json', json({ rules: {} }));
    const result = run();
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead).toEqual([
      `tsconfig.json extends "${MISSING}", which could not be read — strict and noImplicitAny were NOT read`,
    ]);
    expect(result.passed).toBe(false);
  });

  it('both set to true in the file: read, passes', () => {
    write(
      'tsconfig.json',
      json({
        extends: MISSING,
        compilerOptions: { strict: true, noImplicitAny: true },
      })
    );
    write('.eslintrc.json', json({ rules: {} }));
    const result = run();
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead).toBeUndefined();
    expect(result.passed).toBe(true);
  });

  it('an explicit noImplicitAny: false in the file: a finding, not a note', () => {
    write(
      'tsconfig.json',
      json({
        extends: MISSING,
        compilerOptions: { strict: true, noImplicitAny: false },
      })
    );
    write('.eslintrc.json', json({ rules: {} }));
    const result = run();
    expect(result.violations).toEqual([NO_IMPLICIT_ANY_OFF]);
    expect(result.notRead).toBeUndefined();
  });
});
