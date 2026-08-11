import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileFilterUtils } from '../../utils/file-filter-utils';
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
        'Give the rating a readable value — N/10, a letter grade, or a declared status word (reviewed / needs-review / superseded)'
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
    const { glob } = require('glob');

    const found: string[] = glob.sync('**/*.md', {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.nx/**'],
    });

    // `config` used to be accepted here and never read — the comment said the
    // scan deliberately bypassed ignore patterns. That made this the one law
    // whose `includes` / `ignores` meant nothing, and the files it caught were
    // the ones nobody wrote: a README scaffolded into `ios/` by Capacitor is
    // not documentation a project can be asked to footer.
    return found.filter(
      file =>
        !FileFilterUtils.shouldIgnoreFile(
          PathOperations.getRelative(projectRoot, file),
          config,
          undefined,
          true
        )
    );
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

  /**
   * The footer: everything after the LAST horizontal rule in the document.
   *
   * This used to take the FIRST `---` — `content.match(/---\s*\n([\s\S]*?)$/)`
   * with no `m` flag, so `$` could only match end-of-string and the lazy
   * quantifier was forced to the end anyway. Any document using `---` as an
   * ordinary section divider had its whole body swallowed into "the footer",
   * and the first line of prose containing `Rating:` was then judged as the
   * rating — while the real footer sat further down, valid and unread. Long
   * documents, ADRs and changelogs use `---` that way as a matter of course.
   */
  private static extractFooter(content: string): string {
    const lines = content.split('\n');
    for (let index = lines.length - 1; index >= 0; index--) {
      if (/^\s*-{3,}\s*$/.test(lines[index] ?? '')) {
        return lines.slice(index + 1).join('\n');
      }
    }
    return '';
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

    const footerContent = this.extractFooter(content);

    // Check for valid format elements
    const formatChecks = [
      /Document Version:/i,
      /Last Updated:/i,
      /Status:/i,
      /Investment Rating:/i,
    ];

    const validFormat = formatChecks.every(check => check.test(footerContent));

    // A rating field is satisfied by being PRESENT AND READABLE, not by holding
    // one particular value.
    //
    // This used to accept `10/10` and nothing else — so the only footer that
    // passed was one declaring the document perfect. A field with a single legal
    // value carries no information, and requiring it on every file means
    // requiring every file to assert an assessment nobody made: a draft privacy
    // policy, an unfinished launch checklist, a bootstrap changelog. That is the
    // tick-box lie this whole rule set exists to prevent, shipped by us.
    //
    // Any scale a project declares is accepted: N/10, a letter grade, or a
    // status word. What is checked is that someone wrote a rating down.
    //
    // The value is read with markdown emphasis stripped. `Rating:` matches
    // INSIDE a bolded label — `**Investment Rating:** A` captures `** A`, and
    // every letter-grade test then fails on the asterisks rather than on the
    // grade. A bolded label is how the overwhelming majority of footers are
    // written, so the check that was meant to accept any declared scale
    // rejected almost every real file.
    // The LAST rating line in the footer, not the first: if a footer mentions
    // the field more than once, the canonical entry is the one that closes it.
    const ratingLines = [
      ...footerContent.matchAll(/(?:Investment\s+)?Rating:[ \t]*(.+)$/gim),
    ];
    const ratingValue = (ratingLines.at(-1)?.[1] ?? '')
      .replace(/[*_`]/g, '')
      .trim();
    const validRating =
      /\d{1,2}\s*\/\s*10/.test(ratingValue) || // 7/10, 10/10
      /^[A-F][+-]?\b/.test(ratingValue) || // A, B+, C-
      /\b(?:reviewed|needs[- ]review|superseded|draft|current|stale)\b/i.test(
        ratingValue
      ); // a declared status vocabulary

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
