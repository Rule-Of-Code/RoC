/**
 * #642: the scanners return full paths, and seven checks joined the workflow
 * directory in front of such a path again. The read failed in silence and the
 * workflow counted as not containing what the check looks for, so a project
 * with the workflow got the suggestion meant for a project without one.
 *
 * Each check is given a project with one workflow that holds what it looks
 * for; none may suggest adding it. A workflow without it (control) still gets
 * the suggestion. `isSecurityWorkflow` also tested the name on the full path,
 * so a project folder named `security` made every workflow count.
 */
import fs from 'fs';
import path from 'path';

import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { MergeConflictPreventionLaw } from '../../src/checkers/git-laws/merge-conflict-prevention';
import { ReleaseTagStandardsLaw } from '../../src/checkers/git-laws/release-tag-standards';
import { ContinuousComplianceLaw } from '../../src/checkers/sacred-laws/continuous-compliance';
import type { LawCheckContext } from '../../src/types';
import { FileUtils } from '../../src/utils';
import { DependencyScanningValidationPatterns } from '../../src/utils/security/dependency-scanning/dependency-scanning-validation-patterns';
import { checkGitHubSecurityFeatures } from '../../src/utils/security/github-security-features';
import { validateSecretManagement } from '../../src/utils/security/secret-management/secret-management-validation-patterns';
import { makeTempDir } from '../helpers/temp-dirs';

type Config = ReturnType<typeof FileUtils.getMinimalDefaultConfig>;
type Found = { violations: string[]; suggestions: string[] };

/** The private steps under test, reached the way other regression tests do. */
const commitSize = CommitSizeControlLaw as unknown as {
  checkCICDWorkflows(
    root: string,
    context: LawCheckContext,
    suggestions: string[]
  ): void;
};
const mergeConflict = MergeConflictPreventionLaw as unknown as {
  checkConflictPreventionStrategies(root: string, config: Config): Found;
};
const releaseTag = ReleaseTagStandardsLaw as unknown as {
  checkReleaseAutomation(root: string, config: Config): Found;
};
const continuous = ContinuousComplianceLaw as unknown as {
  checkContinuousMonitoring(root: string, config: Config): Found;
};
const dependencyScanning = DependencyScanningValidationPatterns as unknown as {
  checkWorkflowDirectory(workflowsDir: string): boolean;
};

/** Every word the seven checks look for, in one workflow. */
const FULL_WORKFLOW = [
  'name: ci',
  'on:',
  '  schedule:',
  "    - cron: '0 3 * * *'",
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - run: npm audit',
  '      - run: git merge-base HEAD origin/main',
  '      - run: git diff --stat',
  '      - run: npm publish',
  '      - name: secret scanning',
  '        run: npx gitleaks detect',
  '',
].join('\n');

/** A workflow that holds none of them (control). */
const EMPTY_WORKFLOW = [
  'name: ci',
  'on: push',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - run: npm test',
  '',
].join('\n');

function project(prefix: string, workflow: string): string {
  const root = makeTempDir(prefix);
  const dir = path.join(root, '.github', 'workflows');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ci.yml'), workflow);
  return root;
}

/** The suggestion each check gives when the workflow lacks what it looks for. */
const MISSING = {
  commitSize: 'Add PR size validation to GitHub Actions workflows',
  mergeConflict: 'Add merge conflict detection to CI/CD workflows',
  releaseTag: 'Create GitHub Actions workflow for automated releases',
  continuous: 'Add scheduled compliance checks to CI/CD pipeline',
  githubSecurity: 'Add GitHub Actions workflow for security scanning',
  secretManagement: 'Implement secret scanning in your CI/CD pipeline',
} as const;

type Check = keyof typeof MISSING;

function suggestionsFor(root: string): Record<Check, string[]> {
  const config = FileUtils.getMinimalDefaultConfig();
  const commitSizeSuggestions: string[] = [];
  commitSize.checkCICDWorkflows(
    root,
    { projectRoot: root, config } as unknown as LawCheckContext,
    commitSizeSuggestions
  );
  const securitySuggestions: string[] = [];
  checkGitHubSecurityFeatures(root, securitySuggestions);
  return {
    commitSize: commitSizeSuggestions,
    mergeConflict: mergeConflict.checkConflictPreventionStrategies(root, config)
      .suggestions,
    releaseTag: releaseTag.checkReleaseAutomation(root, config).suggestions,
    continuous: continuous.checkContinuousMonitoring(root, config).suggestions,
    githubSecurity: securitySuggestions,
    secretManagement: validateSecretManagement(root).suggestions,
  };
}

describe('workflow checks read the path the scanner gave (#642)', () => {
  it.each(Object.keys(MISSING) as Check[])(
    '%s: a workflow that has it is read, so no suggestion to add it',
    check => {
      const found = suggestionsFor(project('roc-wf642-', FULL_WORKFLOW));
      expect(found[check].some(s => s.startsWith(MISSING[check]))).toBe(false);
    }
  );

  it.each(Object.keys(MISSING) as Check[])(
    '%s: a workflow without it still gets the suggestion (control)',
    check => {
      const found = suggestionsFor(project('roc-wf642-', EMPTY_WORKFLOW));
      expect(found[check].some(s => s.startsWith(MISSING[check]))).toBe(true);
    }
  );

  it('dependency scanning: the workflow is read (no user-visible effect)', () => {
    const root = project('roc-wf642-', FULL_WORKFLOW);
    const dir = path.join(root, '.github', 'workflows');
    expect(dependencyScanning.checkWorkflowDirectory(dir)).toBe(true);
    const control = project('roc-wf642-', EMPTY_WORKFLOW);
    expect(
      dependencyScanning.checkWorkflowDirectory(
        path.join(control, '.github', 'workflows')
      )
    ).toBe(false);
  });

  it('a project folder named "security" does not make every workflow a security workflow', () => {
    const root = project('roc-security-wf642-', EMPTY_WORKFLOW);
    const suggestions: string[] = [];
    checkGitHubSecurityFeatures(root, suggestions);
    expect(suggestions).toContain(MISSING.githubSecurity);
  });

  it('a workflow named for security still counts by its name (control)', () => {
    const root = makeTempDir('roc-wf642-');
    const dir = path.join(root, '.github', 'workflows');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'security.yml'), EMPTY_WORKFLOW);
    const suggestions: string[] = [];
    checkGitHubSecurityFeatures(root, suggestions);
    expect(suggestions).not.toContain(MISSING.githubSecurity);
  });
});
