/**
 * XSS Prevention Law
 * Prevents Cross-Site Scripting vulnerabilities
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { CodeText } from '../../utils/code-text';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { SecurityLawBase } from './security-law-base';
export class XSSPreventionLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for XSS vulnerabilities in source files
    const xssViolations = this.checkXSSPatterns(
      context.projectRoot,
      context.config
    );
    violations.push(...xssViolations.violations);
    suggestions.push(...xssViolations.suggestions);

    // Check for proper sanitization
    const sanitizationViolations = this.checkSanitization(
      context.projectRoot,
      context.config
    );
    violations.push(...sanitizationViolations.violations);
    suggestions.push(...sanitizationViolations.suggestions);

    // Check for Content Security Policy
    const cspViolations = this.checkContentSecurityPolicy(context.projectRoot);
    violations.push(...cspViolations.violations);
    suggestions.push(...cspViolations.suggestions);

    return SecurityLawBase.createResult(
      violations,
      'XSS Prevention Policy',
      'SECURITY',
      suggestions
    );
  }

  private static checkXSSPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Dangerous XSS patterns
    const dangerousPatterns = [
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi,
      /insertAdjacentHTML/gi,
      /document\.write/gi,
      /eval\s*\(/gi,
      /bypassSecurityTrust/gi,
      /\[innerHTML\]\s*=/gi, // Angular innerHTML BINDING — the `=` is required;
      // bare `[innerHTML]` with no assignment is a mention (a doc string, prose),
      // never a real binding, so requiring `=` drops that false positive while
      // still catching every real binding, inline template included.
    ];

    // Get source files
    const sourceFiles = this.getSourceFiles(projectRoot, config);

    for (const file of sourceFiles) {
      try {
        // Strip comments so a `// [innerHTML]` note is not read as a binding —
        // a consumer who removed the real binding and left a comment was being
        // failed for the comment (FE finding). Strings are NOT stripped: an
        // inline template ('<div [innerHTML]="x">') is a real sink.
        const content = CodeText.stripComments(FileUtils.readFile(file));
        const relativePath = PathOperations.getRelative(projectRoot, file);

        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            violations.push(
              `XSS risk in ${relativePath}: ${pattern.source} usage detected`
            );
            suggestions.push(
              `Replace ${pattern.source} with safe alternatives like textContent`
            );
          }
        }
      } catch (_error) {
        continue;
      }
    }

    return { violations, suggestions };
  }

  private static checkSanitization(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const sourceFiles = this.getSourceFiles(projectRoot, config);

    // Sanitization is only REQUIRED where untrusted HTML is rendered. This used
    // to fire on any project with source files that lacked the word DomSanitizer
    // — a near-universal false failure for every TS repo that never renders raw
    // HTML. It now demands a sanitizer only when an HTML-injection sink is
    // actually present. (eval is excluded — DomSanitizer does not address it.)
    const HTML_SINK =
      /innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML|document\.write|bypassSecurityTrust|\[innerHTML\]\s*=/i;

    let hasSanitization = false;
    let hasHtmlSink = false;
    for (const file of sourceFiles) {
      try {
        const raw = FileUtils.readFile(file);
        // The SINK must be real code, not a comment/string mention — strip.
        const code = CodeText.stripComments(raw);
        if (HTML_SINK.test(code)) hasHtmlSink = true;
        // The SANITIZER check reads RAW: an import path like
        // '@angular/platform-browser' is a STRING literal — stripping its
        // contents would hide a sanitizer that is genuinely present.
        if (
          (raw.includes('@angular/platform-browser') &&
            raw.includes('DomSanitizer')) ||
          raw.includes('sanitizeHtml') ||
          raw.includes('sanitizeUrl') ||
          raw.includes('SecurityService')
        ) {
          hasSanitization = true;
        }
      } catch (_error) {
        continue;
      }
    }

    if (hasHtmlSink && !hasSanitization) {
      violations.push(
        'HTML is rendered (innerHTML/bypassSecurityTrust/…) but no sanitizer was found - untrusted HTML must be sanitized'
      );
      suggestions.push(
        'Sanitize rendered HTML via DomSanitizer from @angular/platform-browser (or prefer interpolation / textContent)'
      );
    }

    return { violations, suggestions };
  }

  private static checkContentSecurityPolicy(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const indexHtml = PathOperations.join(projectRoot, 'src/index.html');
    if (FileUtils.exists(indexHtml)) {
      try {
        const content = FileUtils.readFile(indexHtml);
        if (!content.includes('Content-Security-Policy')) {
          violations.push(
            'No Content Security Policy (CSP) found in index.html'
          );
          suggestions.push('Add CSP meta tag to prevent XSS attacks');
        }
      } catch (_error) {
        // Continue if can't read index.html
      }
    }

    return { violations, suggestions };
  }

  private static getSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const tsFiles = CheckerUtils.findTypeScriptFiles(projectRoot, config);
    const htmlFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      config
    );
    return [...tsFiles, ...htmlFiles];
  }
}
