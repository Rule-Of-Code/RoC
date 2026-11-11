/**
 * Accessibility Law Base Class
 * Shared helpers for accessibility (a11y) law checkers. Templates (.html) are
 * read as elements by TemplateMarkup; a template that cannot be read to the
 * end is reported, never passed.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { TemplateMarkup, type MarkupDocument } from './template-markup';

/** One template file, read as elements. */
export interface ReadTemplate {
  file: string;
  relative: string;
  document: MarkupDocument;
}

export interface ReadTemplates {
  templates: ReadTemplate[];
  /** One message per template that could not be read; each is a violation. */
  unread: string[];
}

export abstract class AccessibilityLawBase {
  /** Angular template files (.html). Inline templates are out of scope here. */
  protected static findTemplateFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      context.config,
      context.lawId
    );
  }

  /**
   * Every template, parsed. A template whose markup cannot be read to the end
   * (an opening tag or a quoted value that never closes) is in `unread`.
   */
  protected static readTemplates(context: LawCheckContext): ReadTemplates {
    const templates: ReadTemplate[] = [];
    const unread: string[] = [];
    for (const file of this.findTemplateFiles(context.projectRoot, context)) {
      const relative = this.relative(context.projectRoot, file);
      let content: string;
      try {
        content = FileSystemOperations.readFile(file, { fallbackToEmpty: false });
      } catch {
        unread.push(`${relative}: could not be read — its elements were NOT checked`);
        continue;
      }
      const document = TemplateMarkup.parse(content);
      if (document.error) {
        unread.push(
          `${relative}: could not be read as markup (${document.error}) — its elements were NOT checked`
        );
        continue;
      }
      templates.push({ file, relative, document });
    }
    return { templates, unread };
  }

  protected static relative(projectRoot: string, file: string): string {
    return PathOperations.getRelative(projectRoot, file);
  }

  /** "lines 3, 7" — where in a file the findings are. */
  protected static lines(lines: number[]): string {
    return `line${lines.length === 1 ? '' : 's'} ${lines.join(', ')}`;
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
