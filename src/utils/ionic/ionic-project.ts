/**
 * What the Ionic laws share: which files are pages, whether the app routes
 * through `ion-router-outlet`, and the requirement that gates them.
 *
 * The outlet is the reason these laws exist. Under it a page that is left is
 * kept (hidden, not destroyed), shown again without being constructed, and
 * found again by its URL alone — so code that is correct Angular is wrong
 * Ionic. A project with Ionic components but no outlet does not have that
 * behaviour, and the laws that are about it say so instead of firing.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { TsClasses } from '../ts-classes';

/** The Angular binding: the laws that read Angular classes and routes. */
export const REQUIRES_IONIC_ANGULAR: LawRequirement = {
  anyDependency: ['@ionic/angular'],
};

/** Any binding: the laws about behaviour `@ionic/core` itself has. */
export const REQUIRES_IONIC: LawRequirement = {
  anyDependency: ['@ionic/angular', '@ionic/react', '@ionic/vue'],
};

const OUTLET = /<ion-router-outlet\b/;
const PAGE_MARKUP = /<ion-(?:content|header)\b/;

export class IonicProject {
  /** Non-test .ts and .html files, through the normal scan (so `ignores` apply). */
  static sourceFiles(context: LawCheckContext): string[] {
    return FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.ts', '.html'],
      context.lawId,
      false
    );
  }

  /** Does any template (inline or file) mount `<ion-router-outlet>`? */
  static routesThroughOutlet(context: LawCheckContext): boolean {
    return this.sourceFiles(context).some(file =>
      OUTLET.test(TsClasses.mask(FileUtils.readFileContentSync(file) ?? ''))
    );
  }

  /**
   * A page: a `.page.ts` file, or a component whose template — inline, or the
   * sibling `.html` — has `<ion-content>` or `<ion-header>`.
   */
  static isPage(file: string, content: string): boolean {
    if (file.endsWith('.page.ts')) return true;
    if (!file.endsWith('.ts')) return false;
    if (PAGE_MARKUP.test(TsClasses.mask(content))) return true;
    const sibling = FileUtils.readFileContentSync(file.replace(/\.ts$/, '.html'));
    return Boolean(sibling && PAGE_MARKUP.test(sibling));
  }

  /**
   * The verdict of an outlet law in a project that does not route through
   * `ion-router-outlet`: it passes, and says what it did not find — the held,
   * URL-keyed stack the law is about does not exist here.
   */
  static withoutOutlet(lawName: string, context: LawCheckContext): LawResult {
    return {
      lawName: lawName.toLowerCase().replace(/\s+/g, '-'),
      passed: true,
      message: `${lawName}: no <ion-router-outlet> in any template — the URL-keyed view stack this law is about does not exist in this project`,
      violations: [],
      suggestions: [],
      score: 100,
      config: context.config,
    };
  }

  /** The non-test .ts files that are pages, with their content. */
  static pages(context: LawCheckContext): Array<{ file: string; content: string }> {
    return this.sourceFiles(context)
      .filter(file => file.endsWith('.ts'))
      .map(file => ({ file, content: FileUtils.readFileContentSync(file) ?? '' }))
      .filter(({ file, content }) => this.isPage(file, content));
  }
}
