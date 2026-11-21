/**
 * #434: three laws ask whether the project runs the audit, and each looked in
 * one place. A project that runs `npx ruleofcode audit` from committed git
 * hooks and a CI step — no script that names it, no dependency, because npx
 * fetches the tool — was told it enforced nothing. One shared probe now reads
 * package scripts, committed hooks and CI steps; a project that runs the
 * audit nowhere still fails all three.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PRWorkflowStandardsLaw } from '../../src/checkers/git-laws/pr-workflow-standards';
import { ConstitutionalSupremacyLaw } from '../../src/checkers/sacred-laws/constitutional-supremacy';
import { ContinuousComplianceLaw } from '../../src/checkers/sacred-laws/continuous-compliance';
import type { LawCheckContext } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import { auditInvocations } from '../../src/utils/audit-invocation';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-invocation-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

/** The same project as a git repository: PR Workflow judges only a repository. */
function gitProject(files: Record<string, string>): string {
  const root = project(files);
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

const ctx = (projectRoot: string): LawCheckContext => ({
  projectRoot,
  config: FileUtils.getMinimalDefaultConfig(),
});

/** Scripts that run tests, lint and a build — and no audit, no ruleofcode dependency. */
const BASE: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'lib',
    version: '1.0.0',
    scripts: { test: 'jest', lint: 'eslint .', build: 'tsc' },
    devDependencies: { typescript: '5.9.3', jest: '30.0.0', husky: '9.0.0' },
  }),
  'src/index.ts': 'export const a = 1;\n',
};

const HOOKS: Record<string, string> = {
  '.husky/pre-commit':
    'npx lint-staged\n# a comment: npx ruleofcode audit\nnpx ruleofcode audit --mode=pre-commit --staged\n',
  '.husky/pre-push': 'npx ruleofcode audit --mode=pre-push\n',
};

const CI: Record<string, string> = {
  '.github/workflows/ci.yml':
    'on: push\njobs:\n  audit:\n    runs-on: ubuntu-latest\n    steps:\n      - name: ruleofcode audit\n        run: npx ruleofcode audit --mode=full\n',
};

const SUPREMACY = 'No constitutional law enforcement scripts';
const AUTOMATION = 'No automated compliance checking scripts';
const TOOLS = 'No constitutional law enforcement tools detected';
const missingScripts = (violations: string[] | undefined): string =>
  (violations ?? []).find(v => v.startsWith('Missing automated check')) ?? '';

describe('#434 the audit run from hooks and CI is evidence', () => {
  it('finds the hooks and the CI step that run it — not a comment or a step title', () => {
    expect(auditInvocations(project({ ...BASE, ...HOOKS, ...CI }))).toEqual([
      '.husky/pre-commit',
      '.husky/pre-push',
      '.github/workflows/ci.yml',
    ]);
    expect(
      auditInvocations(
        project({
          ...BASE,
          '.husky/pre-commit':
            '# npx ruleofcode audit\necho "run npx ruleofcode audit"\n',
          '.github/workflows/ci.yml':
            'on: push\njobs:\n  a:\n    steps:\n      - name: ruleofcode audit\n        run: npm test\n',
        })
      )
    ).toEqual([]);
  });

  describe.each([
    ['committed hooks', HOOKS],
    ['a CI step', CI],
  ])('the audit run from %s', (_label, files) => {
    it('Constitutional Supremacy: enforcement found', () => {
      const result = ConstitutionalSupremacyLaw.check(
        ctx(project({ ...BASE, ...files }))
      );
      expect(result.violations).not.toContain(SUPREMACY);
    });

    it('Continuous Compliance: automation and the tool found', () => {
      const result = ContinuousComplianceLaw.check(
        ctx(project({ ...BASE, ...files }))
      );
      expect(result.violations).not.toContain(AUTOMATION);
      expect(result.violations).not.toContain(TOOLS);
    });
  });

  it('Pull Request Workflow: committed pre-commit / pre-push hooks are the precommit / prepush scripts', async () => {
    const result = await PRWorkflowStandardsLaw.check(
      ctx(gitProject({ ...BASE, ...HOOKS }))
    );
    expect(missingScripts(result.violations)).not.toMatch(/precommit|prepush/);
  });

  describe('red control: a project that runs the audit nowhere', () => {
    it('fails all three', async () => {
      const root = project(BASE);
      expect(ConstitutionalSupremacyLaw.check(ctx(root)).violations).toContain(
        SUPREMACY
      );
      const continuous = ContinuousComplianceLaw.check(ctx(root));
      expect(continuous.violations).toContain(AUTOMATION);
      expect(continuous.violations).toContain(TOOLS);
      const pr = await PRWorkflowStandardsLaw.check(ctx(gitProject(BASE)));
      expect(missingScripts(pr.violations)).toMatch(/precommit, prepush/);
    });
  });
});
