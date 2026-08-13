/**
 * SemVer Compliance Law
 * Ensures version numbers follow Semantic Versioning
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { GitTagVersion } from '../../utils/git-tag-version';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { GitLawBase } from './git-law-base';

export class SemVerComplianceLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Check package.json version
    this.checkDeclaredVersion(projectRoot, violations);

    // Check git tags and consistency if git repository
    if (this.isGitRepository(projectRoot)) {
      this.checkGitTags(projectRoot, violations);
      this.checkVersionConsistency(projectRoot, violations);
    }

    return this.createResult(
      violations,
      'SemVer Compliance',
      'GIT_LAW',
      [
        'Use SemVer format: MAJOR.MINOR.PATCH',
        'Add version field to package.json',
        'Tag releases with SemVer versions',
        'Keep package.json and git tags in sync',
        'Use v prefix for git tags (e.g., v1.0.0) — a namespace your pipeline ' +
          'matches on is fine too, e.g. release/v1.0.0',
      ],
      context
    );
  }

  /**
   * The version this project declares, from whichever manifest its stack uses.
   *
   * Until v7.13.0 this was package.json or nothing: a missing package.json was
   * pushed as a VIOLATION, so every Python project failed SemVer unconditionally
   * with no honest way to pass. A law you can only satisfy by adding a Node
   * manifest to a Python repo is a law that rewards a lie.
   */
  private static checkDeclaredVersion(
    projectRoot: string,
    violations: string[]
  ): void {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (!FileUtils.exists(packageJsonPath)) {
      this.checkPythonVersion(projectRoot, violations);
      return;
    }

    try {
      const packageJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          packageJsonPath
        );

      if (!packageJson.version) {
        violations.push('package.json missing version field');
      } else {
        const version = String(packageJson.version as string);
        if (!GitTagVersion.isSemVer(version)) {
          violations.push(
            `package.json version "${version}" does not follow SemVer format`
          );
        }
      }
    } catch {
      violations.push('Unable to parse package.json');
    }
  }

  /**
   * No package.json. On a Python project the version lives in pyproject.toml
   * (PEP 621 `[project]` or Poetry); anywhere else, there is no manifest this
   * law knows how to read, and it stays silent rather than inventing a finding.
   */
  private static checkPythonVersion(
    projectRoot: string,
    violations: string[]
  ): void {
    if (!PythonSatisfaction.isPython(projectRoot)) {
      return;
    }

    const version = PythonSatisfaction.projectVersion(projectRoot);
    if (version === null) {
      violations.push(
        'pyproject.toml declares no version — add [project] version (PEP 621) or [tool.poetry] version'
      );
      return;
    }
    if (!GitTagVersion.isSemVer(version)) {
      violations.push(
        `pyproject.toml version "${version}" does not follow SemVer format`
      );
    }
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

  private static checkVersionConsistency(
    projectRoot: string,
    violations: string[]
  ): void {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) return;

    try {
      const packageJson = FileSystemOperations.readJsonFile(
        packageJsonPath,
        {}
      ) as {
        version?: string;
      };
      if (!packageJson.version) return;

      const tagResult = this.executeGitCommand(
        'git describe --tags --abbrev=0',
        projectRoot
      );
      if (!tagResult.success || !tagResult.stdout) return;

      const latestTag = tagResult.stdout.trim();
      // The version segment, so a namespaced tag compares by what it carries.
      const cleanTag = GitTagVersion.versionOf(latestTag);
      const pkgVersion = String(packageJson.version);

      // package.json AHEAD of the latest tag is the NORMAL pending-release state
      // (version is bumped on a release branch BEFORE the release commit is tagged).
      // Only flag when package.json is BEHIND the latest tag (a stale/forgotten bump).
      const semver = require('semver');
      const pkgV = semver.coerce(pkgVersion)?.version;
      const tagV = semver.coerce(cleanTag)?.version;

      // Nothing to compare unless BOTH carry a version. A tag like `nightly`
      // names no version, so "behind it" states nothing — and the check beside
      // this one already reports its format. The old fallback compared the two
      // as strings and declared the project behind a tag that is not a version.
      if (!pkgV || !tagV) return;

      if (semver.lt(pkgV, tagV)) {
        violations.push(
          `package.json version (${pkgVersion}) is behind the latest git tag (${cleanTag}) — bump it`
        );
      }
    } catch (error) {
      violations.push(
        `Error checking version consistency: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
