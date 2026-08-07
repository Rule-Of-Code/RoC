/**
 * Accessibility Law Base Class
 * Shared helpers for accessibility (a11y) law checkers. RoC has no AST runtime
 * dependency, so detection is regex/string-based over Angular template (.html)
 * files — conservative patterns to keep false positives at zero.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

export abstract class AccessibilityLawBase {
  /** Angular template files (.html). Inline templates are out of scope here. */
  protected static findTemplateFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      context.config
    );
  }

  protected static readTemplate(file: string): string {
    return FileUtils.readFile(file);
  }

  protected static relative(projectRoot: string, file: string): string {
    return PathOperations.getRelative(projectRoot, file);
  }

  /** Strip HTML comments so markup inside `<!-- … -->` is never matched. */
  protected static stripHtmlComments(content: string): string {
    return content.replace(/<!--[\s\S]*?-->/g, ' ');
  }

  /** Extract the opening tags of a given element (e.g. `button`, `input`). */
  protected static openingTags(html: string, tagName: string): string[] {
    const re = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    return html.match(re) ?? [];
  }

  protected static createResult(
    violations: string[],
    title: string,
    recommendations: string[] = [],
    context: LawCheckContext
  ): LawResult {
    return {
      passed: violations.length === 0,
      lawName: title,
      message:
        violations.length === 0
          ? `✅ ${title} compliance verified`
          : `⚠️ ${title}: ${violations.length} issue(s) found`,
      violations,
      suggestions: violations.length > 0 ? recommendations : [],
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 5),
      fixable: violations.length > 0,
      config: context.config,
    };
  }
}
