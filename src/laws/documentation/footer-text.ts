/**
 * The footer of a Markdown file as MD Footer Footer Consistency reads it:
 * where it starts, what it must name, how two footers are compared, and
 * whether its year and relative links are current.
 */
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/** Is the latest year in a footer this year or last (true when it names none)? */
export function isFooterYearCurrent(footer: string): boolean {
  const currentYear = new Date().getFullYear();
  const yearMatches = footer.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches) {
    const latestYear = Math.max(...yearMatches.map(y => parseInt(y)));
    return currentYear - latestYear <= 1;
  }
  return true;
}

/** Do the relative links of a footer resolve beside the file it closes? */
export function checkFooterLinks(footer: string, filePath: string): boolean {
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

/** The footer of a Markdown text: after the last `---`, else its last lines, when they read as one. */
export function extractFooter(
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
    if (hasFooterKeywords(afterLastSeparator)) {
      return afterLastSeparator.trim();
    }
  }

  // Fallback: Check last few lines for footer-like content
  const lines = content.split('\n');
  const linesToCheck = thresholds?.footerLastLinesCount ?? 5;
  const lastLines = lines.slice(-linesToCheck).join('\n');
  if (hasFooterKeywords(lastLines)) {
    return lastLines;
  }

  return null;
}

/** A footer with years, emails, URLs and spacing normalised, for comparison. */
export function normalizeFooterPattern(footer: string): string {
  // Normalize footer for comparison by removing dynamic content
  return footer
    .toLowerCase()
    .replace(/\d{4}/g, 'YEAR') // Replace years
    .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // Replace emails
    .replace(/https?:\/\/[^\s)]+/g, 'URL') // Replace URLs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/** Does a footer name the element: copyright, license or contact? */
export function hasFooterElement(footer: string, element: string): boolean {
  const elementPatterns: Record<string, RegExp> = {
    copyright: /copyright|©|\(c\)/i,
    license: /license|licensed|mit|apache|gpl/i,
    contact: /contact|email|@|support/i,
  };

  const pattern = elementPatterns[element];
  return pattern instanceof RegExp ? pattern.test(footer) : false;
}

/** Does the text carry footer keywords: copyright, license, contact, author? */
export function hasFooterKeywords(content: string): boolean {
  const footerKeywords = [
    /copyright|©|\(c\)/i,
    /license|licensed/i,
    /contact|support/i,
    /author|maintainer/i,
  ];

  return footerKeywords.some(pattern => pattern.test(content));
}

/** Is the footer year of one file current (true when it has no footer or cannot be read)? */
export function isFileFooterCurrent(
  filePath: string,
  thresholds: { footerLastLinesCount: number }
): boolean {
  try {
    const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
    const footer = extractFooter(content, thresholds);

    if (footer) {
      return isFooterYearCurrent(footer);
    }
    return true;
  } catch (_error) {
    // Skip files that can't be read
    return true;
  }
}

/** Do the footer links of one file resolve (true when it has no footer or cannot be read)? */
export function validateFooterLinksInFile(
  filePath: string,
  thresholds: { footerLastLinesCount: number }
): boolean {
  try {
    const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
    const footer = extractFooter(content, thresholds);

    if (footer) {
      return checkFooterLinks(footer, filePath);
    }
    return true;
  } catch (_error) {
    // Skip files that can't be read
    return true;
  }
}

/** Does the footer of one file match the template pattern (true when it has none or cannot be read)? */
export function fileMatchesTemplate(
  filePath: string,
  templatePattern: string,
  thresholds: { footerLastLinesCount: number }
): boolean {
  try {
    const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
    const footer = extractFooter(content, thresholds);

    if (footer) {
      const footerPattern = normalizeFooterPattern(footer);
      return footerPattern === templatePattern;
    }
    return true;
  } catch (_error) {
    // Skip files that can't be read
    return true;
  }
}
