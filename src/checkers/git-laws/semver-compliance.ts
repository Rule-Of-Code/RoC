/**
 * SemVer Compliance Law
 * Ensures version numbers follow Semantic Versioning
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { GitTagVersion } from '../../utils/git-tag-version';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CapacitorNativeVersions } from './capacitor-native-versions';
import { type DeclaredVersion, declaredVersion } from './declared-version';
import { GitLawBase } from './git-law-base';

export class SemVerComplianceLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // The version the project declares, from the manifest it releases from
    const declared = this.checkDeclaredVersion(projectRoot, violations);

    // A Capacitor project declares it twice more, in the native shells.
    const native = CapacitorNativeVersions.check(projectRoot);
    violations.push(...native.violations);

    // Check git tags and consistency if git repository
    if (this.isGitRepository(projectRoot)) {
      this.checkGitTags(projectRoot, violations);
      this.checkVersionConsistency(projectRoot, declared, violations);
    }

    const result = this.createResult(
      violations,
      'SemVer Compliance',
      'GIT_LAW',
      [
        'Use SemVer format: MAJOR.MINOR.PATCH',
        'Declare the version in the manifest you release from: package.json, or pyproject.toml / setup.cfg in a Python project',
        'Tag releases with SemVer versions',
        'Keep the declared version and git tags in sync',
        'Use v prefix for git tags (e.g., v1.0.0) — a namespace your pipeline ' +
          'matches on is fine too, e.g. release/v1.0.0',
        'In a Capacitor project, keep versionName and MARKETING_VERSION equal to package.json, or inject them at build time',
      ],
      context
    );
    if (native.notes.length > 0) {
      result.message = `${result.message} — native versions not compared: ${native.notes.join('; ')}`;
    }
    return result;
  }

  /**
   * The version this project declares, from whichever manifest its stack uses.
   *
   * Until v7.13.0 this was package.json or nothing: a missing package.json was
   * pushed as a VIOLATION, so every Python project failed SemVer unconditionally
   * with no honest way to pass. A law you can only satisfy by adding a Node
   * manifest to a Python repo is a law that rewards a lie. The same holds for
   * a tooling package.json beside pyproject.toml (#546): the Python manifest
   * is read first.
   */
  private static checkDeclaredVersion(
    projectRoot: string,
    violations: string[]
  ): DeclaredVersion | null {
    const declared = declaredVersion(projectRoot);

    if (!declared) {
      // No manifest declares a version. On a Python project that is a finding;
      // anywhere else there is no manifest this law knows how to read, and it
      // stays silent rather than inventing one.
      if (PythonSatisfaction.isPython(projectRoot)) {
        violations.push(
          'pyproject.toml declares no version — add [project] version (PEP 621) or [tool.poetry] version'
        );
      }
      return null;
    }

    if (declared.unreadable) {
      violations.push(`Unable to parse ${declared.manifest}`);
    } else if (declared.version === null) {
      violations.push(`${declared.manifest} missing version field`);
    } else if (!GitTagVersion.isSemVer(declared.version)) {
      violations.push(
        `${declared.manifest} version "${declared.version}" does not follow SemVer format`
      );
    }
    return declared;
  }

  /**
   * A tag name is a ref; the version lives in its last segment. This check
   * used to test the whole ref, so every namespaced release tag failed on its
   * namespace alone — while `checkPackageVersion` beside it validated the
   * version string correctly. Both now ask the same shared helper.
   */
  private static checkGitTags(projectRoot: string, violations: string[]): void {
    try {
      const result = this.executeGitCommand('git tag --list', projectRoot);
      if (!result.success || !result.stdout) return;

      const tags = result.stdout
        .trim()
        .split('\n')
        .filter(tag => tag.length > 0);

      for (const tag of tags) {
        if (!GitTagVersion.isSemVerTag(tag)) {
          violations.push(`Git tag "${tag}" does not follow SemVer format`);
        }
      }
    } catch (error) {
      violations.push(
        `Cannot access git tags: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * The declared version against the latest tag, for every manifest kind.
   * Until #546 only package.json was compared, so a pyproject version left
   * behind its release tag was never reported.
   */
  private static checkVersionConsistency(
    projectRoot: string,
    declared: DeclaredVersion | null,
    violations: string[]
  ): void {
    if (!declared?.version) return;

    try {
      const tagResult = this.executeGitCommand(
        'git describe --tags --abbrev=0',
        projectRoot
      );
      if (!tagResult.success || !tagResult.stdout) return;

      const latestTag = tagResult.stdout.trim();
      // The version segment, so a namespaced tag compares by what it carries.
      const cleanTag = GitTagVersion.versionOf(latestTag);

      // The declared version AHEAD of the latest tag is the NORMAL pending-release state
      // (version is bumped on a release branch BEFORE the release commit is tagged).
      // Only flag when it is BEHIND the latest tag (a stale/forgotten bump).
      const semver = require('semver');
      const declaredV = semver.coerce(declared.version)?.version;
      const tagV = semver.coerce(cleanTag)?.version;

      // Nothing to compare unless BOTH carry a version. A tag like `nightly`
      // names no version, so "behind it" states nothing — and the check beside
      // this one already reports its format. The old fallback compared the two
      // as strings and declared the project behind a tag that is not a version.
      if (!declaredV || !tagV) return;

      if (semver.lt(declaredV, tagV)) {
        violations.push(
          `${declared.manifest} version (${declared.version}) is behind the latest git tag (${cleanTag}) — bump it`
        );
      }
    } catch (error) {
      violations.push(
        `Error checking version consistency: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
