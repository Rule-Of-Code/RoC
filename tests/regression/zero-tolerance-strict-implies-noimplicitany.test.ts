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
