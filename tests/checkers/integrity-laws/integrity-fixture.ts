/**
 * Fixtures for the integrity laws: a throwaway project whose files git
 * TRACKS (the laws read `git ls-files`, so the fixture is a real repository,
 * not a mocked listing), and the card of a law by title.
 */
import { execFileSync } from 'child_process';
import { INTEGRITY_LAWS } from '../../../src/data/integrity-laws';
import type { EnhancedConstitutionalLaw } from '../../../src/types/enhanced-law.types';
import { project, writeFiles } from '../toolkit-fixture';

const git = (root: string, args: string[]): void => {
  execFileSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });
};

/** A temp project with `tracked` added to a fresh git index, and `untracked` only on disk. */
export function gitProject(
  tracked: Record<string, string>,
  untracked: Record<string, string> = {}
): string {
  const root = project(tracked);
  git(root, ['init', '-q']);
  git(root, ['add', '-A']);
  writeFiles(root, untracked);
  return root;
}

export function card(title: string): EnhancedConstitutionalLaw {
  const law = INTEGRITY_LAWS.find(candidate => candidate.title === title);
  if (!law) throw new Error(`no integrity law titled ${title}`);
  return law;
}
