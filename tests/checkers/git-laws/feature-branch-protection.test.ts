/**
 * Feature Branch Protection on real git work trees: the law reads the
 * branching docs, the pre-commit hook in .git/hooks, the protection docs, the
 * CI config and the name of the current branch.
 */
import fs from 'fs';
import path from 'path';

import { FeatureBranchProtectionLaw } from '../../../src/checkers/git-laws/feature-branch-protection';
import { branchConventionSuggestion } from '../../../src/utils/git/branch-naming';
import { ctx, project } from '../toolkit-fixture';
import { gitIn, repo } from '../../utils/git-fixture';

const NO_DOCS = 'CodeNamingAnalyzer: No branch naming conventions documented';
const DOCUMENT =
  'CodeNamingAnalyzer: Document branch naming conventions (feature/, bugfix/, hotfix/)';
const CREATE_HOOKS =
  'CodeNamingAnalyzer: Create git hooks to enforce branch naming conventions';
const PROTECTION_DOCS =
  'Document branch protection rules and required status checks';
const CI = 'Configure CI/CD to run on feature branch pushes';

/** A work tree on `branch` (unborn: no commit needed to name it). */
const onBranch = (branch: string, files: Record<string, string>) => {
  const root = repo(files);
  gitIn(root, 'checkout', '-q', '-b', branch);
  return root;
};
const hook = (root: string, content: string) => {
  const file = path.join(root, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(file, content);
};

/** Everything the law looks for, in place. */
const COMPLETE = {
  'CONTRIBUTING.md':
    '# Contributing\n\nBranch naming: feature/<topic>, bugfix/<topic>.\n',
  '.github/BRANCH_PROTECTION.md':
    'Protection: one required review and a green status check.\n',
  '.github/workflows/ci.yml':
    'on:\n  pull_request:\n  push:\n    branches: [develop]\n',
};

const run = (root: string, overrides: Record<string, unknown> = {}) =>
  FeatureBranchProtectionLaw.check(ctx(root, overrides));

describe('FeatureBranchProtectionLaw', () => {
  it('passes a repository with docs, a naming hook, CI and a well-named branch', () => {
    const root = onBranch('feature/add-user-login', COMPLETE);
    hook(root, '#!/bin/sh\n# check the branch name\n');

    const result = run(root);

    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('asks for every piece in a bare repository on main', () => {
    const root = onBranch('main', { 'README.md': '# x\n' });

    const result = run(root);

    expect(result.violations).toEqual([NO_DOCS]);
    expect(result.suggestions).toEqual([
      DOCUMENT,
      CREATE_HOOKS,
      PROTECTION_DOCS,
      CI,
    ]);
  });

  it('asks a pre-commit hook that does not look at the branch to do so', () => {
    // Advice comes with a finding (LawBase.createResult): the undocumented
    // naming is the finding here.
    const root = onBranch('develop', {
      ...COMPLETE,
      'CONTRIBUTING.md': '# Contributing\n',
    });
    hook(root, '#!/bin/sh\nnpm test\n');

    expect(run(root).suggestions).toEqual([
      DOCUMENT,
      'Add branch naming validation to git hooks',
    ]);
  });

  it('gives no advice when there is no finding', () => {
    // No protection docs and no CI, but nothing the law fails on.
    const root = onBranch('develop', {
      'CONTRIBUTING.md': COMPLETE['CONTRIBUTING.md'],
    });
    hook(root, '#!/bin/sh\nnpm test\n');

    expect(run(root)).toMatchObject({
      passed: true,
      violations: [],
      suggestions: [],
    });
  });

  it('does not count a branching doc that says nothing about branch names', () => {
    const root = onBranch('develop', {
      ...COMPLETE,
      'CONTRIBUTING.md': '# Contributing\n\nRun the tests before a PR.\n',
    });
    hook(root, '#!/bin/sh\n# branch check\n');

    expect(run(root).violations).toEqual([NO_DOCS]);
  });

  it('reports a branch that breaks the convention and is too short', () => {
    const root = onBranch('wip', COMPLETE);
    hook(root, '#!/bin/sh\n# branch check\n');

    const result = run(root);

    expect(result.violations).toEqual([
      "Branch 'wip' doesn't follow naming convention",
      'Branch name should be more descriptive (min 10 chars)',
    ]);
    expect(result.suggestions).toEqual([
      branchConventionSuggestion(ctx(root).config),
      'Use descriptive branch names: feature/add-user-authentication',
    ]);
  });

  it('reads the minimum branch name length from thresholds.git', () => {
    const root = onBranch('feature/x', COMPLETE);
    hook(root, '#!/bin/sh\n# branch check\n');

    expect(run(root).violations).toEqual([
      'Branch name should be more descriptive (min 10 chars)',
    ]);
    expect(
      run(root, { thresholds: { git: { minBranchNameLength: 5 } } }).violations
    ).toEqual([]);
  });

  it('does not judge a folder that is not a git work tree', () => {
    const root = project({ 'README.md': '# x\n' });

    const result = run(root);

    expect(result.violations).not.toContain(NO_DOCS);
    expect(result.suggestions).not.toContain(CI);
  });
});
