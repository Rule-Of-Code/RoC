/**
 * Branch Protection Standards on real project fixtures. The law fails only
 * when there is no git repository or its config cannot be read; its advice is
 * given with a finding (LawBase.createResult), so the cases that read the
 * advice use a `.git` folder without a config.
 */
import { BranchProtectionStandardsLaw } from '../../../src/checkers/version-control-laws/branch-protection-standards';
import { ctx, project } from '../toolkit-fixture';
import { repo } from '../../utils/git-fixture';

const run = (root: string) => BranchProtectionStandardsLaw.check(ctx(root));

/** A `.git` folder git did not make: the law finds no config in it. */
const NO_CONFIG = { '.git/HEAD': 'ref: refs/heads/main\n' };

describe('BranchProtectionStandardsLaw', () => {
  it('reports a folder that is not a git repository', () => {
    const result = run(project({ 'README.md': '# x\n' }));

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(['No Git repository found']);
    expect(result.suggestions).toEqual(['Initialize Git repository: git init']);
  });

  it('passes a git repository whose config it can read', () => {
    const result = run(repo({ 'README.md': '# x\n' }));

    expect(result).toMatchObject({
      passed: true,
      violations: [],
      suggestions: [],
    });
  });

  it('reports a config it cannot read, with all the advice for a bare project', () => {
    const result = run(
      project({
        ...NO_CONFIG,
        'package.json': JSON.stringify({ name: 'x', devDependencies: {} }),
      })
    );

    expect(result.violations).toEqual(['Unable to read Git configuration']);
    expect(result.suggestions).toEqual([
      'Ensure Git repository is properly initialized',
      'CodeNamingAnalyzer: Document branch naming conventions (feature/, bugfix/, hotfix/)',
      'Create CONTRIBUTING.md with Git workflow guidelines',
      'Consider using commitizen or commitlint for consistent commit messages',
      'Consider setting up CI/CD pipeline for automated testing',
      'Create SECURITY.md to document security vulnerability reporting',
    ]);
  });

  it('drops the advice a project has already followed', () => {
    const result = run(
      project({
        ...NO_CONFIG,
        '.github/CONTRIBUTING.md': '# Contributing\n',
        'docs/SECURITY.md': '# Security\n',
        '.github/workflows/ci.yml': 'on: [push]\njobs: {}\n',
        'package.json': JSON.stringify({
          name: 'x',
          devDependencies: { '@commitlint/cli': '^19.0.0' },
        }),
      })
    );

    expect(result.suggestions).toEqual([
      'Ensure Git repository is properly initialized',
      'Ensure CI checks are required before merging to main branch',
      'Configure branch protection rules on your Git hosting platform',
    ]);
  });

  it('accepts commitizen as well as commitlint, and asks nothing of a project without package.json', () => {
    const withCommitizen = run(
      project({
        ...NO_CONFIG,
        'package.json': JSON.stringify({
          devDependencies: { commitizen: '4' },
        }),
      })
    );
    const withoutManifest = run(project({ ...NO_CONFIG }));
    const commitAdvice =
      'Consider using commitizen or commitlint for consistent commit messages';

    expect(withCommitizen.suggestions).not.toContain(commitAdvice);
    expect(withoutManifest.suggestions).not.toContain(commitAdvice);
  });
});
