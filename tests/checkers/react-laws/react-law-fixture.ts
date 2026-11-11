/**
 * Fixtures shared by the React law tests: a throwaway React (or Next) project,
 * the law's own card, the selection proof through the engine's `requires`
 * reader, and the two ways a law must fail closed — files it could not read,
 * and a scan that found no React source at all.
 */
import { REACT_LAWS } from '../../../src/data/react-laws';
import type { EnhancedConstitutionalLaw } from '../../../src/types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../../src/types/law.types';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ReactProject } from '../../../src/utils/react/react-project';
import { ctx, manifest, project } from '../toolkit-fixture';

export const REACT_DEPS = { react: '19.3.0', 'react-dom': '19.3.0' };
export const NEXT_DEPS = { ...REACT_DEPS, next: '16.4.6' };

/** A project declaring react (or `deps`), with the given files. */
export function reactProject(
  files: Record<string, string>,
  deps: Record<string, string> = REACT_DEPS
): string {
  return project({ 'package.json': manifest(deps), ...files });
}

type Law = { check(context: LawCheckContext): LawResult };

/** Run `law` over a React project made of `files`. */
export function run(law: Law, files: Record<string, string>, deps = REACT_DEPS): LawResult {
  return law.check(ctx(reactProject(files, deps)));
}

export function cardFor(checkFunction: string): EnhancedConstitutionalLaw {
  const card = REACT_LAWS.find(law => law.checkFunction === checkFunction);
  if (!card) throw new Error(`no card for ${checkFunction}`);
  return card;
}

/** Selected where the subject is declared, not selected where it is not. */
export function describeSelection(checkFunction: string, subject: Record<string, string>): void {
  describe(`${checkFunction} selection (requires)`, () => {
    const card = cardFor(checkFunction);
    it('is selected where the project declares its subject', () => {
      expect(lawRequirementsMet(card.requires, reactProject({}, subject))).toBe(true);
    });
    it('is selected where only an app of the workspace declares it', () => {
      const root = project({
        'package.json': manifest({}),
        'apps/web/package.json': manifest(subject),
      });
      expect(lawRequirementsMet(card.requires, root)).toBe(true);
    });
    it('is not selected in a project without it (Angular, plain Node)', () => {
      expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
      expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest({ express: '5.0.0' }) }))).toBe(false);
    });
  });
}

/** Files not read, and an empty scan, are violations — never a pass. */
export function describeFailsClosed(name: string, law: Law, deps = REACT_DEPS): void {
  describe(`${name} fails closed`, () => {
    afterEach(() => jest.restoreAllMocks());

    it('reports files it could not read', () => {
      jest
        .spyOn(ReactProject, 'parse')
        .mockReturnValue({ sources: [], unread: ['src/a.tsx: could not be read'] });
      const result = run(law, { 'src/a.tsx': 'export const A = () => null;' }, deps);
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringContaining('src/a.tsx: could not be read — '),
      ]);
    });

    it('does not pass on a scan that found no React source', () => {
      const result = run(law, { 'README.md': '# empty' }, deps);
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringContaining('no React source file'),
      ]);
    });
  });
}
