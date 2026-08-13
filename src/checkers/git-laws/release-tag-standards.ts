/**
 * Release Tag Standards Law Implementation
 * Ensures proper semantic versioning and release tagging
 */

import { execSync } from 'child_process';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileSystemOperations, FileUtils } from '../../utils';
import { GitTagVersion } from '../../utils/git-tag-version';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { PathOperations } from '../../utils/path-operations';
import { GitLawBase } from './git-law-base';

export class ReleaseTagStandardsLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'Release Tag Standards',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for semantic versioning compliance
    const semverAnalysis = this.checkSemanticVersioning(context.projectRoot);
    violations.push(...semverAnalysis.violations);
    suggestions.push(...semverAnalysis.suggestions);

    // Check tag naming conventions
    const tagNamingAnalysis = this.checkTagNamingConventions(
      context.projectRoot
    );
    violations.push(...tagNamingAnalysis.violations);
    suggestions.push(...tagNamingAnalysis.suggestions);

    // Check release automation
    const automationAnalysis = this.checkReleaseAutomation(
      context.projectRoot,
      context.config
    );
    violations.push(...automationAnalysis.violations);
    suggestions.push(...automationAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Release Tag Standards',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkSemanticVersioning(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check package.json version format
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile(
          packageJsonPath,
          {}
        ) as Record<string, unknown>;
        const { version } = packageJson;

        if (!version) {
          violations.push('No version specified in package.json');
          suggestions.push('Add semantic version to package.json');
        } else if (
          typeof version === 'string' &&
          !this.isValidSemVer(version)
        ) {
          violations.push(`Invalid semantic version format: ${version}`);
          suggestions.push(
            'Use semantic versioning format: MAJOR.MINOR.PATCH (e.g., 1.2.3)'
          );
        }
      } catch (_error) {
        violations.push('Invalid package.json format');
        suggestions.push('Fix package.json syntax');
      }
    } else {
      suggestions.push('Create package.json with version field');
    }

    // Check for existing tags and their format
    try {
      const tags = execSync('git tag --list --sort=-version:refname', {
        cwd: projectRoot,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(tag => tag);

      const invalidTags = tags.filter(tag => !this.isValidTagFormat(tag));
      if (invalidTags.length > 0) {
        violations.push(
          `Invalid tag formats found: ${invalidTags.slice(0, 3).join(', ')}`
        );
        suggestions.push(
          'Use semantic version tags: v1.2.3, 1.2.3, or the same under a ' +
            'namespace your pipeline matches on, e.g. release/v1.2.3'
        );
      }

      if (tags.length === 0) {
        suggestions.push('Create initial release tag: git tag v0.1.0');
      }
    } catch (_error) {
      // No tags or git command failed
      suggestions.push('Create semantic version tags for releases');
    }

    return { violations, suggestions };
  }

  private static checkTagNamingConventions(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for release documentation
    const releaseDocs = [
      'CHANGELOG.md',
      'RELEASES.md',
      'docs/RELEASES.md',
      'docs/VERSIONING.md',
    ];

    const hasReleaseDocs = releaseDocs.some(doc =>
      FileUtils.exists(PathOperations.join(projectRoot, doc))
    );

    if (!hasReleaseDocs) {
      violations.push('No release documentation found');
      suggestions.push('Create CHANGELOG.md to document releases and versions');
    }

    // Check for consistent tag prefixing
    try {
      const tags = execSync('git tag --list', {
        cwd: projectRoot,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(tag => tag);

      if (tags.length > 0) {
        // Compare the VERSION segment, not the whole ref. `v1.2.3` and
        // `release/v1.2.3` are the same style; reading the ref made a project
        // that moved its tags under a namespace look inconsistent with itself.
        const vPrefixed = tags.filter(tag => GitTagVersion.isVPrefixed(tag));
        const nonVPrefixed = tags.filter(
          tag => !GitTagVersion.isVPrefixed(tag)
        );

        if (vPrefixed.length > 0 && nonVPrefixed.length > 0) {
          violations.push(
            'Inconsistent tag prefixing (mix of v-prefixed and non-prefixed)'
          );
          suggestions.push(
            'Use consistent tag format: either v1.2.3 or 1.2.3 for all releases'
          );
        }
      }
    } catch (_error) {
      // Git command failed
    }

    return { violations, suggestions };
  }

  private static checkReleaseAutomation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for release automation tools
    try {
      const allDependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const packageJson =
        ProjectTypeDetectorValidation.getPackageJson(projectRoot);
      const scripts =
        (packageJson && typeof packageJson === 'object'
          ? ((packageJson as Record<string, unknown>).scripts as
              | Record<string, unknown>
              | undefined)
          : undefined) ?? {};

      const releaseTools = [
        'semantic-release',
        'standard-version',
        'release-please',
        'np',
      ];

      const hasReleaseTools = releaseTools.some(tool =>
        Boolean(allDependencies[tool])
      );

      if (!hasReleaseTools) {
        suggestions.push(
          'Consider using release automation tools: semantic-release, standard-version'
        );
      }

      // Check for release scripts
      const hasReleaseScripts = Object.keys(scripts).some(
        script => script.includes('release') || script.includes('version')
      );

      if (!hasReleaseScripts) {
        suggestions.push(
          'Add release scripts to package.json (release, prerelease, postrelease)'
        );
      }
    } catch (_error) {
      // Continue if package.json can't be parsed
    }

    // Check for GitHub Release workflows
    const workflowsDir = PathOperations.join(
      projectRoot,
      '.github',
      'workflows'
    );
    if (FileUtils.exists(workflowsDir)) {
      try {
        const workflows = CheckerUtils.findFilesByExtension(
          workflowsDir,
          ['yml', 'yaml'],
          config
        );
        const hasReleaseWorkflow = workflows.some((workflow: string) => {
          try {
            const workflowContent = FileUtils.readFileSync(
              PathOperations.join(workflowsDir, workflow),
              'utf8'
            );
            return (
              workflowContent.includes('release') ||
              workflowContent.includes('tag') ||
              workflowContent.includes('publish')
            );
          } catch (_error) {
            return false;
          }
        });

        if (!hasReleaseWorkflow) {
          suggestions.push(
            'Create GitHub Actions workflow for automated releases'
          );
        }
      } catch (_error) {
        // Continue if workflows can't be read
      }
    }

    // Check for release configuration files
    const releaseConfigFiles = [
      '.releaserc',
      '.releaserc.json',
      '.releaserc.js',
      'release.config.js',
    ];

    const hasReleaseConfig = releaseConfigFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (!hasReleaseConfig) {
      suggestions.push(
        'Configure release automation with .releaserc or release.config.js'
      );
    }

    return { violations, suggestions };
  }

  private static isValidSemVer(version: string): boolean {
    return GitTagVersion.isSemVer(version);
  }

  private static isValidTagFormat(tag: string): boolean {
    // Accept v1.2.3, 1.2.3, and the same under a namespace — release/v1.2.3.
    // Shared with semantic-versioning-standards, which judged the same tags
    // through its own copy of this rule and was fixed separately from it.
    return GitTagVersion.isSemVerTag(tag);
  }
}
