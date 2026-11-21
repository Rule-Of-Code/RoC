/**
 * #435: branch protection on GitHub and GitLab is configured on the server
 * (protected branches, rulesets); there is no file in the repository to
 * read, exactly as on Bitbucket and Azure, which the law already accepted.
 * And the message is built from the violations: a run whose only violation
 * was branch protection printed "Missing " with an empty list.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PrePrQualityGatesLaw } from '../../src/laws/deployment/pre-pr-quality-gates';
import { FileUtils } from '../../src/utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

/** Hooks, a PR template and a pull_request CI trigger: only branch protection is left to judge. */
function repoWithRemote(url: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-pre-pr-'));
  roots.push(root);
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  write('package.json', JSON.stringify({ name: 'x', version: '1.0.0' }));
  write('.husky/pre-commit', 'npx lint-staged\n');
  write('.github/PULL_REQUEST_TEMPLATE.md', '## Checklist\n- [ ] Tests\n');
  write(
    '.github/workflows/ci.yml',
    'on:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n'
  );
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['remote', 'add', 'origin', url], { cwd: root });
  return root;
}

const check = (root: string) =>
  PrePrQualityGatesLaw.check({
    projectRoot: root,
    config: FileUtils.getMinimalDefaultConfig(),
  });

describe('#435 Pre-PR Quality Gates', () => {
  it.each([
    'https://github.com/example/app.git',
    'git@github.com:example/app.git',
    'https://gitlab.com/example/app.git',
  ])('a %s remote keeps branch protection on the server: not missing', url => {
    const result = check(repoWithRemote(url));
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('a host it cannot recognise is still asked, and the message names what is missing', () => {
    const result = check(repoWithRemote('https://git.example.org/app.git'));
    expect(result.violations).toEqual([
      'Missing branch protection configuration',
    ]);
    expect(result.message).toBe(
      '⚠️ Pre-PR Quality Gates: Missing branch protection configuration'
    );
  });
});
