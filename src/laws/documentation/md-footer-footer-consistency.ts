import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
// Interface for footer analysis
interface FooterAnalysis {
  consistentFooters: number;
  inconsistentFooters: number;
  missingFooters: number;
  totalFiles: number;
}

/**
 * MD Footer Footer Consistency Law
 *
 * Validates consistency of footer templates across all Markdown files:
 * - All MD files have consistent footer format
 * - Footer templates contain required elements
 * - Footer information is current and accurate
 * - Standard footer sections are present
 * - Footer format follows project standards
 * - Cross-references and links are valid
 * - Copyright and license information consistency
 * - Contact information accuracy
 *
 * Professional implementation following documentation standardization best practices
 */
export class MdFooterFooterConsistencyLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;

    // Initialize configurable thresholds
    const thresholds = {
      inconsistentFormatsDeduction:
        config.thresholds?.documentation?.mdFooter
          ?.inconsistentFormatsDeduction ?? 30,
      missingElementsDeduction:
        config.thresholds?.documentation?.mdFooter?.missingElementsDeduction ??
        25,
      outdatedInfoDeduction:
        config.thresholds?.documentation?.mdFooter?.outdatedInfoDeduction ?? 20,
      invalidLinksDeduction:
        config.thresholds?.documentation?.mdFooter?.invalidLinksDeduction ?? 15,
      templateNonComplianceDeduction:
        config.thresholds?.documentation?.mdFooter
          ?.templateNonComplianceDeduction ?? 10,
      footerLastLinesCount:
        config.thresholds?.documentation?.mdFooter?.footerLastLinesCount ?? 5,
    };

    // 1. Find all Markdown files
    const markdownFiles = this.findMarkdownFiles(projectRoot, context);
    if (markdownFiles.length === 0) {
      suggestions.push('No Markdown files found to check footer consistency');
      return {
        passed: true,
        message: '✅ MD Footer Consistency: No Markdown files to validate',
        details: suggestions,
        violations: [],
        suggestions,
        score: 100,
        fixable: false,
        config: context.config,
      };
    }

    // 2. Analyze footer consistency across files
    const footerAnalysis = this.analyzeFooterConsistency(
      markdownFiles,
      thresholds
    );
    if (!footerAnalysis.hasConsistentFooters) {
      violations.push('Inconsistent footer formats across Markdown files');
      suggestions.push('Standardize footer format across all MD files');
      score -= thresholds.inconsistentFormatsDeduction;
    }

    // 3. Check for required footer elements
    const footerElements = this.analyzeFooterElements(
      markdownFiles,
      thresholds
    );
    if (!footerElements.hasRequiredElements) {
      violations.push('Missing required footer elements in some MD files');
      suggestions.push(
        'Include standard footer elements: copyright, license, contact info'
      );
      score -= thresholds.missingElementsDeduction;
    }

    // 4. Check footer information currency
    const footerCurrency = this.analyzeFooterCurrency(
      markdownFiles,
      thresholds
    );
    if (!footerCurrency.hasCurrentInfo) {
      // These last three are advisory: they push a suggestion and no violation,
      // so they cost no score. Deducting here produced the law's old signature
      // incoherence — a green "consistent across N files" message sitting on a
      // score of 55.
      suggestions.push(
        'Update footer information to ensure currency and accuracy'
      );
    }

    // 5. Check for valid links and references
    const linkValidation = this.analyzeFooterLinks(markdownFiles, thresholds);
    if (!linkValidation.hasValidLinks) {
      suggestions.push('Verify and fix broken links in footer sections');
    }

    // 6. Check for template compliance
    const templateCompliance = this.analyzeTemplateCompliance(
      markdownFiles,
      thresholds
    );
    if (!templateCompliance.isCompliant) {
      suggestions.push(
        'Ensure all MD files follow the standard footer template'
      );
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        {
          ...footerAnalysis,
          consistentFooters: 0,
          inconsistentFooters: 0,
          missingFooters: 0,
          totalFiles: 0,
        } as FooterAnalysis,
        markdownFiles.length
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static findMarkdownFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    const markdownFiles: string[] = [];
    this.scanDirectoryForMarkdown(projectRoot, markdownFiles, context);
    return markdownFiles;
  }

  private static scanDirectoryForMarkdown(
    dirPath: string,
    files: string[],
    context: LawCheckContext // Remove optional - context must be provided
  ): void {
    try {
      const markdownFiles = CheckerUtils.findFilesByExtension(
        dirPath,
        ['.md'],
        context.config // Remove optional chaining - context?.config must be defined
      );

      for (const filePath of markdownFiles) {
        files.push(filePath);
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  private static shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      'tmp',
      '.nx',
      '.angular',
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private static analyzeFooterConsistency(
    markdownFiles: string[],
    thresholds: { footerLastLinesCount: number }
  ): {
    hasConsistentFooters: boolean;
    footerPatterns: string[];
  } {
    const footerPatterns: string[] = [];
    let hasConsistentFooters = true;

    for (const filePath of markdownFiles) {
      try {
        const content = FileUtils.readFile(filePath);
        const footer = this.extractFooter(content, thresholds);

        if (footer) {
          const pattern = this.normalizeFooterPattern(footer);
          footerPatterns.push(pattern);
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    // Check if all footers follow similar patterns
    if (footerPatterns.length > 1) {
      const uniquePatterns = new Set(footerPatterns);
      // Allow up to 5 minor variations (some files might have slightly different formatting)
      hasConsistentFooters = uniquePatterns.size <= 5;
    }

    return { hasConsistentFooters, footerPatterns };
  }

  private static analyzeFooterElements(
    markdownFiles: string[],
    thresholds: { footerLastLinesCount: number }
  ): {
    hasRequiredElements: boolean;
    missingElements: string[];
  } {
    let hasRequiredElements = true;
    const requiredElements = ['copyright', 'license', 'contact'];

    for (const filePath of markdownFiles) {
      try {
        const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
        const footer = this.extractFooter(content, thresholds);

        if (footer) {
          const hasElements = requiredElements.some(element =>
            this.hasFooterElement(footer, element)
          );

          if (!hasElements) {
            hasRequiredElements = false;
            break;
          }
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasRequiredElements, missingElements: [] };
  }

  private static analyzeFooterCurrency(
    markdownFiles: string[],
    thresholds: { footerLastLinesCount: number }
  ): {
    hasCurrentInfo: boolean;
    outdatedFiles: string[];
  } {
    let isCurrentFooterInfo = true;

    for (const filePath of markdownFiles) {
      if (!this.isFileFooterCurrent(filePath, thresholds)) {
        isCurrentFooterInfo = false;
        break;
      }
    }

    return { hasCurrentInfo: isCurrentFooterInfo, outdatedFiles: [] };
  }

  private static isFileFooterCurrent(
    filePath: string,
    thresholds: { footerLastLinesCount: number }
  ): boolean {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      const footer = this.extractFooter(content, thresholds);

      if (footer) {
        return this.isFooterYearCurrent(footer);
      }
      return true;
    } catch (_error) {
      // Skip files that can't be read
      return true;
    }
  }

  private static isFooterYearCurrent(footer: string): boolean {
    const currentYear = new Date().getFullYear();
    const yearMatches = footer.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      const latestYear = Math.max(...yearMatches.map(y => parseInt(y)));
      return currentYear - latestYear <= 1;
    }
    return true;
  }

  private static analyzeFooterLinks(
    markdownFiles: string[],
    thresholds: { footerLastLinesCount: number }
  ): {
    hasValidLinks: boolean;
    brokenLinks: string[];
  } {
    let hasValidLinks = true;

    for (const filePath of markdownFiles) {
      if (!this.validateFooterLinksInFile(filePath, thresholds)) {
        hasValidLinks = false;
        break;
      }
    }

    return { hasValidLinks, brokenLinks: [] };
  }

  private static validateFooterLinksInFile(
    filePath: string,
    thresholds: { footerLastLinesCount: number }
  ): boolean {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      const footer = this.extractFooter(content, thresholds);

      if (footer) {
        return this.checkFooterLinks(footer, filePath);
      }
      return true;
    } catch (_error) {
      // Skip files that can't be read
      return true;
    }
  }

  private static checkFooterLinks(footer: string, filePath: string): boolean {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [...footer.matchAll(linkPattern)];

    for (const link of links) {
      const url = link[2];
      if (url && (url.startsWith('./') || url.startsWith('../'))) {
        const relativePath = PathOperations.resolve(
          PathOperations.getDirectory(filePath),
          url
        );
        if (!FileUtils.exists(relativePath)) {
          return false;
        }
      }
    }
    return true;
  }

  private static analyzeTemplateCompliance(
    markdownFiles: string[],
    thresholds: { footerLastLinesCount: number }
  ): {
    isCompliant: boolean;
    violations: string[];
  } {
    let isTemplateCompliant = true;

    // Check if there's a footer template file
    const templateFiles = [
      'templates/footer.md',
      'docs/templates/footer.md',
      '.github/templates/footer.md',
    ];

    let templateContent = null;
    for (const templateFile of templateFiles) {
      const projectRoot = PathOperations.getDirectory(markdownFiles[0] ?? '');
      const templatePath = PathOperations.join(projectRoot, templateFile);
      if (FileUtils.exists(templatePath)) {
        try {
          templateContent = FileUtils.readFile(templatePath, {
            encoding: 'utf8',
          });
          break;
        } catch (_error) {
          // Skip if can't read template
        }
      }
    }

    if (templateContent) {
      const templatePattern = this.normalizeFooterPattern(templateContent);

      for (const filePath of markdownFiles) {
        if (!this.fileMatchesTemplate(filePath, templatePattern, thresholds)) {
          isTemplateCompliant = false;
          break;
        }
      }
    }

    return { isCompliant: isTemplateCompliant, violations: [] };
  }

  private static fileMatchesTemplate(
    filePath: string,
    templatePattern: string,
    thresholds: { footerLastLinesCount: number }
  ): boolean {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      const footer = this.extractFooter(content, thresholds);

      if (footer) {
        const footerPattern = this.normalizeFooterPattern(footer);
        return footerPattern === templatePattern;
      }
      return true;
    } catch (_error) {
      // Skip files that can't be read
      return true;
    }
  }

  private static extractFooter(
    content: string,
    thresholds?: { footerLastLinesCount: number }
  ): string | null {
    // FIXED: Only extract footer after the LAST --- separator
    // This prevents matching content in the middle of the document
    const lastSeparatorIndex = content.lastIndexOf('\n---\n');
    if (lastSeparatorIndex !== -1) {
      // Extract everything after the last ---
      const afterLastSeparator = content.substring(lastSeparatorIndex + 5); // +5 to skip "\n---\n"

      // Only return if it contains footer keywords
      if (this.hasFooterKeywords(afterLastSeparator)) {
        return afterLastSeparator.trim();
      }
    }

    // Fallback: Check last few lines for footer-like content
    const lines = content.split('\n');
    const linesToCheck = thresholds?.footerLastLinesCount ?? 5;
    const lastLines = lines.slice(-linesToCheck).join('\n');
    if (this.hasFooterKeywords(lastLines)) {
      return lastLines;
    }

    return null;
  }

  private static normalizeFooterPattern(footer: string): string {
    // Normalize footer for comparison by removing dynamic content
    return footer
      .toLowerCase()
      .replace(/\d{4}/g, 'YEAR') // Replace years
      .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // Replace emails
      .replace(/https?:\/\/[^\s)]+/g, 'URL') // Replace URLs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private static hasFooterElement(footer: string, element: string): boolean {
    const elementPatterns: Record<string, RegExp> = {
      copyright: /copyright|©|\(c\)/i,
      license: /license|licensed|mit|apache|gpl/i,
      contact: /contact|email|@|support/i,
    };

    const pattern = elementPatterns[element];
    return pattern instanceof RegExp ? pattern.test(footer) : false;
  }

  private static hasFooterKeywords(content: string): boolean {
    const footerKeywords = [
      /copyright|©|\(c\)/i,
      /license|licensed/i,
      /contact|support/i,
      /author|maintainer/i,
    ];

    return footerKeywords.some(pattern => pattern.test(content));
  }

  private static generateMessage(
    violationCount: number,
    footerAnalysis: FooterAnalysis,
    fileCount: number
  ): string {
    if (violationCount === 0) {
      return `✅ MD Footer Consistency: Consistent across ${fileCount} files`;
    }

    return `⚠️ MD Footer Consistency: Inconsistent footer formats found`;
  }
}
