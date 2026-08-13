import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ReleaseTagStandardsLaw } from '../../src/checkers/git-laws/release-tag-standards';
import { SemVerComplianceLaw } from '../../src/checkers/git-laws/semver-compliance';
import { GitTagVersion } from '../../src/utils/git-tag-version';
import { FileUtils } from '../../src/utils';

/**
 * A git tag is a REF, not a version string. `release/v1.2.3` carries the
 * version in its last segment, and the namespace before it is what deployment
 * triggers match on — a Cloud Build `tag: ^release/v.*$`, a GitHub Actions
 * `on.push.tags: 'release/v*'`.
 *
 * Two laws judged the whole ref against SemVer, each through its own copy of
 * the rule, so both rejected every namespaced tag and fixing one would not
 * have fixed the other. They ask one shared helper now.
 *
 * The advice was the sharper half of the defect: "rename it to v1.2.3" would
 * disconnect a release from the pipeline that deploys it.
 */
describe('a namespaced release tag carries a version', () => {
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

  const repoWithTags = (...tags: string[]): void => {
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'svc', version: '0.1.0' })
    );
    fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '# Changelog\n');
    git('git init -q');
    git('git config user.email t@example.com');
    git('git config user.name Test');
    git('git add -A');
    git('git commit -qm init');
    for (const tag of tags) git(`git tag ${tag}`);
  };

  /**
   * Findings about the SHAPE of a tag. Scoped deliberately: "package.json is
   * behind the latest git tag" is a different check, and a correct one — the
   * fixture version stays at 0.1.0 while the tags move ahead.
   */
  const tagFormatFindings = async (
    law: typeof ReleaseTagStandardsLaw | typeof SemVerComplianceLaw
  ): Promise<string[]> => {
    const result = await law.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    return (result.violations ?? []).filter(v =>
      /Invalid tag formats|does not follow SemVer format|Inconsistent tag prefixing/.test(
        v
      )
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-tag-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('the version segment is what gets validated', () => {
    it.each([
      ['release/v1.2.3'],
      ['release/1.2.3'],
      ['releases/v1.2.3'],
      ['v1.2.3'],
      ['1.2.3'],
      ['release/v1.2.3-rc.1'],
    ])('%s is accepted by both laws', async tag => {
      repoWithTags(tag);

      expect(await tagFormatFindings(ReleaseTagStandardsLaw)).toEqual([]);
      expect(await tagFormatFindings(SemVerComplianceLaw)).toEqual([]);
    });

    // The red control: namespace tolerance must not become "anything passes".
    it.each([['release/not-a-version'], ['nightly'], ['v1.2']])(
      '%s is still reported by both laws',
      async tag => {
        repoWithTags(tag);

        expect((await tagFormatFindings(ReleaseTagStandardsLaw)).length).toBeGreaterThan(0);
        expect((await tagFormatFindings(SemVerComplianceLaw)).length).toBeGreaterThan(0);
      }
    );
  });

  /**
   * The third site, and the one neither report named: prefix consistency read
   * the whole ref, so `startsWith('v')` was false for `release/v1.2.3`. A
   * project moving its tags under a namespace was told it was inconsistent
   * with itself — while every one of its tags was v-prefixed.
   */
  describe('prefix consistency compares the version segment', () => {
    it('does not call a repository migrating to a namespace inconsistent', async () => {
      repoWithTags('v0.1.0', 'release/v0.2.0');

      const findings = await tagFormatFindings(ReleaseTagStandardsLaw);

      expect(findings.filter(v => /Inconsistent tag prefixing/.test(v))).toEqual(
        []
      );
    });

    it('still reports a genuine mix of styles', async () => {
      repoWithTags('release/v0.1.0', 'release/0.2.0');

      const findings = await tagFormatFindings(ReleaseTagStandardsLaw);

      expect(
        findings.some(v => /Inconsistent tag prefixing/.test(v))
      ).toBe(true);
    });
  });

  /**
   * The fourth site, surfaced while proving the third. `git describe` returns
   * whatever the latest tag is; when it carries no version, the comparison fell
   * back to a string inequality and announced the project was "behind" it.
   */
  describe('being behind a tag requires the tag to carry a version', () => {
    const findings = async (): Promise<string[]> => {
      const result = await SemVerComplianceLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });
      return (result.violations ?? []).filter(v => /is behind/.test(v));
    };

    it('says nothing about a tag that names no version', async () => {
      repoWithTags('nightly');

      expect(await findings()).toEqual([]);
    });

    it('still reports a version left behind a namespaced tag', async () => {
      repoWithTags('release/v0.2.0');

      expect((await findings()).length).toBeGreaterThan(0);
    });

    it('says nothing when the version is ahead of the tag', async () => {
      repoWithTags('release/v0.0.9');

      expect(await findings()).toEqual([]);
    });
  });

  /** The advice must not recommend a rename that breaks a CI trigger. */
  it('offers the namespaced form as acceptable', async () => {
    repoWithTags('nightly');

    const result = await ReleaseTagStandardsLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

    expect(
      (result.suggestions ?? []).some(s => /release\/v1\.2\.3/.test(s))
    ).toBe(true);
  });

  describe('the shared helper', () => {
    it.each([
      ['release/v1.2.3', '1.2.3'],
      ['release/1.2.3', '1.2.3'],
      ['v1.2.3', '1.2.3'],
      ['1.2.3', '1.2.3'],
      ['a/b/v1.2.3', '1.2.3'],
    ])('reads the version of %s as %s', (tag, expected) => {
      expect(GitTagVersion.versionOf(tag)).toBe(expected);
    });

    it.each([
      ['v1.2.3', true],
      ['release/v1.2.3', true],
      ['1.2.3', false],
      ['release/1.2.3', false],
    ])('reads the prefix style of %s as v-prefixed=%s', (tag, expected) => {
      expect(GitTagVersion.isVPrefixed(tag)).toBe(expected);
    });

    // A name that merely starts with "v" is not a v-prefixed version.
    it('does not read "version-1" as a v-prefixed version', () => {
      expect(GitTagVersion.isVPrefixed('version-1')).toBe(false);
    });
  });

  /**
   * Four copies of the SemVer grammar had accumulated — one per law that
   * judges tags, one for version strings, one in a generic validator — in
   * dialects that disagreed at the edges. Two laws holding their own copy of
   * one rule is how the same defect came to need fixing twice.
   */
  describe('one SemVer definition, not four', () => {
    it.each([
      ['1.2.3', true],
      ['0.0.1', true],
      ['1.2.3-rc.1', true],
      ['1.2.3+build.5', true],
      ['1.2.3-beta.2+build.4', true],
      ['1.2', false],
      ['v1.2.3', false],
      ['1.2.3.4', false],
      ['1.2.3-01', false],
    ])('reads %s as SemVer=%s', (version, expected) => {
      expect(GitTagVersion.isSemVer(version as string)).toBe(expected);
    });

    it('hands out a fresh pattern, so no caller can carry match state', () => {
      const first = GitTagVersion.semVerPattern();
      const second = GitTagVersion.semVerPattern();

      expect(first).not.toBe(second);
      expect(first.test('1.2.3')).toBe(true);
      expect(second.test('1.2.3')).toBe(true);
    });
  });
});
