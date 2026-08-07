/**
 * Git Ignore Standards Law
 * Ensures proper .gitignore configuration
 */

import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { PathOperations } from '../../utils/path-operations';
import { VersionControlLawBase } from './version-control-law-base';
export class GitIgnoreStandardsLaw {
  private static readonly GITIGNORE_FILE = '.gitignore';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const violationDetails: ViolationDetail[] = [];

    // Check if .gitignore exists
    const gitignorePath = PathOperations.join(
      context.projectRoot,
      this.GITIGNORE_FILE
    );
    if (!FileUtils.exists(gitignorePath)) {
      violations.push('Missing .gitignore file');
      suggestions.push('Create .gitignore file to exclude unnecessary files');
      violationDetails.push({
        file: this.GITIGNORE_FILE,
        message: 'File does not exist',
      });
    } else {
      // Check .gitignore content
      const content = FileUtils.readFile(gitignorePath);
      const issues = this.analyzeGitignore(
        content,
        context.projectRoot,
        violationDetails
      );
      violations.push(...issues.violations);
      suggestions.push(...issues.suggestions);
    }

    // Check for accidentally committed files
    const committedIssues = this.checkCommittedFiles(
      context.projectRoot,
      violationDetails
    );
    violations.push(...committedIssues.violations);
    suggestions.push(...committedIssues.suggestions);

    const result = VersionControlLawBase.createResult(
      violations,
      'Git Ignore Standards',
      'VERSION_CONTROL',
      suggestions,
      context
    );

    // Add violationDetails to result
    result.violationDetails = violationDetails;

    return result;
  }

  private static analyzeGitignore(
    content: string,
    projectRoot: string,
    violationDetails: ViolationDetail[]
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    // Essential patterns: the universal three, plus whatever this project's
    // stack actually produces.
    //
    // Until v7.13.0 node_modules and dist were demanded from EVERY project, so a
    // correct Python .gitignore failed with two violations for build output the
    // repo never creates — passable only by ignoring paths that do not exist.
    const essentialPatterns = [
      { pattern: '.env', description: 'Environment variables' },
      { pattern: '*.log', description: 'Log files' },
      { pattern: '.DS_Store', description: 'macOS system files' },
      ...this.stackArtifactPatterns(projectRoot),
    ];

    for (const essential of essentialPatterns) {
      if (!lines.some(line => line.includes(essential.pattern))) {
        violations.push(`Missing .gitignore entry: ${essential.pattern}`);
        suggestions.push(
          `Add ${essential.pattern} to .gitignore (${essential.description})`
        );
        violationDetails.push({
          file: this.GITIGNORE_FILE,
          message: `Missing pattern: ${essential.pattern} (${essential.description})`,
        });
      }
    }

    // Check for framework-specific patterns
    if (ProjectTypeDetector.isAngularProject(projectRoot)) {
      const angularPatterns = ['coverage/', 'tmp/', '.angular/'];
      for (const pattern of angularPatterns) {
        if (!lines.some(line => line.includes(pattern.replace('/', '')))) {
          suggestions.push(`Consider adding ${pattern} for Angular projects`);
        }
      }
    }

    return { violations, suggestions };
  }

  /**
   * The build artifacts this project actually produces — required only of the
   * stack that creates them. A project with neither manifest is asked for
   * nothing stack-specific rather than being handed an invented finding.
   */
  private static stackArtifactPatterns(
    projectRoot: string
  ): { pattern: string; description: string }[] {
    const patterns: { pattern: string; description: string }[] = [];

    if (PythonSatisfaction.isPython(projectRoot)) {
      patterns.push(
        { pattern: '__pycache__', description: 'Python bytecode cache' },
        { pattern: '.venv', description: 'Python virtual environment' }
      );
    }
    if (FileUtils.exists(PathOperations.join(projectRoot, 'package.json'))) {
      patterns.push(
        { pattern: 'node_modules', description: 'Node.js dependencies' },
        { pattern: 'dist', description: 'Build output' }
      );
    }

    return patterns;
  }

  private static checkCommittedFiles(
    projectRoot: string,
    violationDetails: ViolationDetail[]
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for common accidentally committed files
    const riskyFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'npm-debug.log',
      '.DS_Store',
    ];

    for (const riskyFile of riskyFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, riskyFile))) {
        // Check if it's likely tracked (simple heuristic)
        violations.push(`Potentially tracked sensitive file: ${riskyFile}`);
        suggestions.push(
          `Add ${riskyFile} to .gitignore and remove from Git history`
        );
        violationDetails.push({
          file: riskyFile,
          message: 'Sensitive file found - should be in .gitignore',
        });
      }
    }

    return { violations, suggestions };
  }
}
