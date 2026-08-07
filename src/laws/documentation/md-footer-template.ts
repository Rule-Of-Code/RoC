import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
/**
 * MD Footer Template Law
 *
 * MANDATORY law for standardized markdown file footers that checks for:
 * - Mandatory footer template presence in all .md files
 * - Standardized footer format with version, date, status, investment rating
 * - Constitutional compliance information
 * - Quality metrics and app version consistency
 * - Professional documentation standards
 * - Footer consistency across all markdown files
 * - Investment rating display (10/10 Supreme Excellence)
 *
 * Professional implementation following documentation best practices
 * Status: MANDATORY - All MD files must have compliant footers
 */
export class MdFooterTemplateLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;

    // 1. Find all markdown files in the project
    const markdownFiles = this.findMarkdownFiles(projectRoot, config);
    if (markdownFiles.length === 0) {
      violations.push('No markdown files found in project');
      suggestions.push('Create documentation with proper MD files');
      score -= 20;

      return Promise.resolve({
        passed: false,
        score,
        message: 'No markdown files to validate',
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        fixable: true,
        config: context.config,
      });
    }

    // 2. Check footer compliance for each markdown file
    const footerAnalysis = this.analyzeFooterCompliance(markdownFiles);

    if (footerAnalysis.missingFooters.length > 0) {
      const missingCount = footerAnalysis.missingFooters.length;
      const totalCount = markdownFiles.length;
      violations.push(
        `${missingCount}/${totalCount} markdown files missing constitutional footers`
      );
      suggestions.push('Add mandatory constitutional footer to all MD files');
      score -= Math.min(40, (missingCount / totalCount) * 100);
    }

    // 3. Check footer format consistency
    if (footerAnalysis.invalidFormatFooters.length > 0) {
      violations.push(
        `${footerAnalysis.invalidFormatFooters.length} files have incorrect footer format`
      );
      suggestions.push('Use standardized constitutional footer template');
      score -= 20;
    }

    // 4. Check for required footer elements
    const requiredElements = this.checkRequiredFooterElements(
      footerAnalysis.validFooters
    );
    if (requiredElements.missingElements.length > 0) {
      violations.push(
        `Missing footer elements: ${requiredElements.missingElements.join(
          ', '
        )}`
      );
      suggestions.push(
        'Include all mandatory footer elements: version, date, status, investment rating'
      );
      score -= 15;
    }

    // 5. Check investment rating consistency
    if (footerAnalysis.invalidRatings.length > 0) {
      violations.push(
        `${footerAnalysis.invalidRatings.length} files have incorrect investment rating format`
      );
      suggestions.push(
        'Use standard investment rating: 🏆 10/10 SUPREME EXCELLENCE'
      );
      score -= 10;
    }

    // 6. Check date format consistency
    if (footerAnalysis.invalidDates.length > 0) {
      violations.push(
        `${footerAnalysis.invalidDates.length} files have incorrect date format`
      );
      suggestions.push('Use standard date format: December 27, 2025');
      score -= 10;
    }

    // Calculate final compliance percentage
    const compliancePercentage = Math.round(
      (footerAnalysis.compliantFiles / markdownFiles.length) * 100
    );

    // Violations-driven, like the rest of the registry. Every deduction here
    // currently co-occurs with a violation, so this is the same verdict today —
    // but a score threshold is one suggestion-only deduction away from printing
    // a green message over a failing verdict (the bug Strategic Document
    // Updates actually shipped). The score stays informational.
    const finalScore = Math.max(0, score);

    return Promise.resolve({
      passed: violations.length === 0,
      score: finalScore,
      message:
        violations.length === 0
          ? `MD footer template fully compliant (${compliancePercentage}% coverage)`
          : `MD footer violations found: ${violations.join(
              ', '
            )}. Compliance: ${compliancePercentage}%`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    });
  }

  private static findMarkdownFiles(
    projectRoot: string,
    config: LawCheckContext['config']
  ): string[] {
    // Use glob directly to find markdown files, bypassing ignore patterns
    const { glob } = require('glob');

    return glob.sync('**/*.md', {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.nx/**'],
    });
  }

  private static analyzeFooterCompliance(markdownFiles: string[]): {
    compliantFiles: number;
    missingFooters: string[];
    invalidFormatFooters: string[];
    validFooters: Array<{ file: string; content: string }>;
    invalidRatings: string[];
    invalidDates: string[];
  } {
    const missingFooters: string[] = [];
    const invalidFormatFooters: string[] = [];
    const validFooters: Array<{ file: string; content: string }> = [];
    const invalidRatings: string[] = [];
    const invalidDates: string[] = [];
    let compliantFiles = 0;

    for (const file of markdownFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const footerAnalysis = this.analyzeFileFooter(content, file);

        if (!footerAnalysis.hasFooter) {
          missingFooters.push(PathOperations.getRelative(process.cwd(), file));
        } else if (
          this.collectFooterIssues(footerAnalysis, file, {
            invalidFormatFooters,
            validFooters,
            invalidRatings,
            invalidDates,
          })
        ) {
          compliantFiles++;
        }
      } catch (_error) {
        missingFooters.push(PathOperations.getRelative(process.cwd(), file));
      }
    }

    return {
      compliantFiles,
      missingFooters,
      invalidFormatFooters,
      validFooters,
      invalidRatings,
      invalidDates,
    };
  }

  private static collectFooterIssues(
    footerAnalysis: {
      validFormat: boolean;
      validRating: boolean;
      validDate: boolean;
      footerContent: string;
    },
    file: string,
    issues: {
      invalidFormatFooters: string[];
      validFooters: Array<{ file: string; content: string }>;
      invalidRatings: string[];
      invalidDates: string[];
    }
  ): boolean {
    if (!footerAnalysis.validFormat) {
      issues.invalidFormatFooters.push(
        PathOperations.getRelative(process.cwd(), file)
      );
    }

    if (!footerAnalysis.validRating) {
      issues.invalidRatings.push(
        PathOperations.getRelative(process.cwd(), file)
      );
    }

    if (!footerAnalysis.validDate) {
      issues.invalidDates.push(PathOperations.getRelative(process.cwd(), file));
    }

    issues.validFooters.push({ file, content: footerAnalysis.footerContent });

    return (
      footerAnalysis.validFormat &&
      footerAnalysis.validRating &&
      footerAnalysis.validDate
    );
  }

  private static analyzeFileFooter(
    content: string,
    _filePath: string
  ): {
    hasFooter: boolean;
    validFormat: boolean;
    validRating: boolean;
    validDate: boolean;
    footerContent: string;
  } {
    // Check for constitutional footer indicators
    const footerPatterns = [
      /📋 Constitutional Footer/i,
      /Constitutional Compliance:/i,
      /Investment Rating:/i,
      /Document Version:/i,
      /Last Updated:/i,
    ];

    const hasFooter = footerPatterns.some(pattern => pattern.test(content));

    if (!hasFooter) {
      return {
        hasFooter: false,
        validFormat: false,
        validRating: false,
        validDate: false,
        footerContent: '',
      };
    }

    // Extract footer content (usually after last ---)
    const footerMatch = content.match(/---\s*\n([\s\S]*?)$/);
    const footerContent: string = footerMatch ? (footerMatch[1] ?? '') : '';

    // Check for valid format elements
    const formatChecks = [
      /Document Version:/i,
      /Last Updated:/i,
      /Status:/i,
      /Investment Rating:/i,
    ];

    const validFormat = formatChecks.every(check => check.test(footerContent));

    // Check for valid investment rating format
    const validRating =
      /🏆.*10\/10.*SUPREME EXCELLENCE|Investment Rating:.*10\/10|Rating:.*10\/10/i.test(
        footerContent
      );

    // Check for valid date format (flexible to accommodate various formats)
    const validDate =
      /Last Updated:.*\d{4}|Updated:.*\d{4}|\w+ \d{1,2}, \d{4}/i.test(
        footerContent
      );

    return {
      hasFooter: true,
      validFormat,
      validRating,
      validDate,
      footerContent,
    };
  }

  private static checkRequiredFooterElements(
    validFooters: Array<{ file: string; content: string }>
  ): {
    missingElements: string[];
    presentElements: string[];
  } {
    const requiredElements = [
      { name: 'Document Version', pattern: /Document Version:/i },
      { name: 'Last Updated', pattern: /Last Updated:/i },
      { name: 'Status', pattern: /Status:/i },
      { name: 'Investment Rating', pattern: /Investment Rating:/i },
    ];

    const elementPresence = requiredElements.map(element => ({
      name: element.name,
      present: validFooters.some(footer =>
        element.pattern.test(footer.content)
      ),
    }));

    const missingElements = elementPresence
      .filter(e => !e.present)
      .map(e => e.name);
    const presentElements = elementPresence
      .filter(e => e.present)
      .map(e => e.name);

    return { missingElements, presentElements };
  }
}
