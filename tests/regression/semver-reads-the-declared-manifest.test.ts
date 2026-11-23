import { execSync } from '../../src/utils/child-process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SemVerComplianceLaw } from '../../src/checkers/git-laws/semver-compliance';
import { FileUtils } from '../../src/utils';

/**
 * #546. A Python project declares its version in pyproject.toml. A
 * package.json next to it, kept only for tooling (hooks, lint scripts), was
 * read instead whenever it existed, and its 0.1.0 was compared with the
 * release tag: "package.json version (0.1.0) is behind the latest git tag".
 * The project's real version matched the tag. Without package.json, the
 * pyproject version was format-checked but never compared with the tag, so
 * a stale one passed.
 */
describe('Semantic Versioning Standards reads the manifest the project releases from', () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const repo = (files: Record<string, string>, tag: string): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-546-'));
    roots.push(root);
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    const git = (command: string): string =>
      execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    git('git init -q');
    git('git config user.email t@example.com');
    git('git config user.name Test');
    git('git add -A');
    git('git commit -qm init');
    git(`git tag ${tag}`);
    return root;
  };

  const violations = async (root: string): Promise<string[]> => {
    const result = await SemVerComplianceLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    return result.violations ?? [];
  };

  const PYPROJECT_140 = '[project]\nname = "service"\nversion = "1.4.0"\n';
  const TOOLING_PACKAGE_JSON = JSON.stringify({
    name: 'tooling',
    version: '0.1.0',
    private: true,
    scripts: { lint: 'ruff check .' },
  });

  it('does not compare a tooling package.json with the tag of a Python project', async () => {
    const root = repo(
      {
        'package.json': TOOLING_PACKAGE_JSON,
        'pyproject.toml': PYPROJECT_140,
        'service/__init__.py': '',
      },
      'v1.4.0'
    );

    expect(await violations(root)).toEqual([]);
  });

  it('still reports a Python project whose pyproject version is behind the tag, naming pyproject.toml', async () => {
    const root = repo(
      {
        'package.json': TOOLING_PACKAGE_JSON,
        'pyproject.toml': '[project]\nname = "service"\nversion = "1.3.0"\n',
        'service/__init__.py': '',
      },
      'v1.4.0'
    );

    const found = await violations(root);
    expect(found.some(v => /pyproject\.toml.*1\.3\.0.*behind/.test(v))).toBe(
      true
    );
    expect(found.some(v => v.includes('package.json'))).toBe(false);
  });

  it('compares pyproject.toml with the tag also when there is no package.json', async () => {
    const root = repo(
      {
        'pyproject.toml': '[project]\nname = "service"\nversion = "1.3.0"\n',
        'service/__init__.py': '',
      },
      'v1.4.0'
    );

    const found = await violations(root);
    expect(found.some(v => /pyproject\.toml.*1\.3\.0.*behind/.test(v))).toBe(
      true
    );
  });

  it('reads a setup.cfg [metadata] version and names setup.cfg', async () => {
    const root = repo(
      {
        'package.json': TOOLING_PACKAGE_JSON,
        'setup.cfg': '[metadata]\nname = service\nversion = 1.3.0\n',
        'service/__init__.py': '',
      },
      'v1.4.0'
    );

    const found = await violations(root);
    expect(found).toEqual([
      'setup.cfg version (1.3.0) is behind the latest git tag (1.4.0) — bump it',
    ]);
  });

  it('a Node project is still judged by package.json', async () => {
    const root = repo(
      { 'package.json': JSON.stringify({ name: 'web', version: '0.1.0' }) },
      'v1.4.0'
    );

    const found = await violations(root);
    expect(
      found.some(v => /package\.json version \(0\.1\.0\) is behind/.test(v))
    ).toBe(true);
  });
});
