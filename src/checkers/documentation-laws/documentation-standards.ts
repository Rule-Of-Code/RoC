/**
 * Documentation Standards Law
 * Ensures proper project documentation
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export class DocumentationStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for essential documentation files
    const essentialDocs = [
      { file: 'README.md', purpose: 'Project overview and setup instructions' },
      { file: 'CONTRIBUTING.md', purpose: 'Contribution guidelines' },
      { file: 'LICENSE', purpose: 'Project license' },
      { file: 'CHANGELOG.md', purpose: 'Version history' },
    ];

    for (const doc of essentialDocs) {
      if (
        !FileUtils.exists(PathOperations.join(context.projectRoot, doc.file))
      ) {
        violations.push(`Missing ${doc.file}`);
        suggestions.push(`Create ${doc.file}: ${doc.purpose}`);
      }
    }

    // Check README quality
    const readmePath = PathOperations.join(context.projectRoot, 'README.md');
    if (FileUtils.exists(readmePath)) {
      const readmeContent = FileUtils.readFile(readmePath);
      const readmeIssues = this.analyzeReadmeQuality(readmeContent, context);
      violations.push(...readmeIssues.violations);
      suggestions.push(...readmeIssues.suggestions);
    }

    // Check for documentation directory
    const docsDir = PathOperations.join(context.projectRoot, 'docs');
    if (!FileUtils.exists(docsDir)) {
      suggestions.push(
        'Consider creating docs/ directory for detailed documentation'
      );
    }

    // Initialize configurable thresholds
    const perViolationDeduction =
      context.config.thresholds?.documentation?.standards
        ?.perViolationDeduction ?? 15;

    return LawBase.buildDetailedResult({
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Documentation standards met'
          : `${violations.length} documentation violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * perViolationDeduction),
      context,
    });
  }

  private static analyzeReadmeQuality(
    content: string,
    context: LawCheckContext
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const minReadmeLength =
      context.config.thresholds?.documentation?.standards?.minReadmeLength ??
      100;
    if (content.length < minReadmeLength) {
      violations.push('README.md is too short');
      suggestions.push('Expand README with proper project description');
    }

    const requiredSections = [
      { text: '# ', section: 'Title' },
      { text: 'installation', section: 'Installation instructions' },
      { text: 'usage', section: 'Usage examples' },
    ];

    for (const required of requiredSections) {
      if (!content.toLowerCase().includes(required.text.toLowerCase())) {
        suggestions.push(`Add ${required.section} section to README`);
      }
    }

    return { violations, suggestions };
  }
}
