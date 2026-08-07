import type { RuleOfCodeConfig } from '../types';
import { CheckerUtils } from './checker-utils';
import { FileUtils } from './file-utils';

/** A file carries an Angular component when it applies the @Component decorator. */
const COMPONENT_DECORATOR = /@Component\s*\(/;

/**
 * Find Angular components by their DECORATOR, not their filename.
 *
 * Angular 20 dropped the mandatory `*.component.ts` suffix — a component is now
 * often `home.ts`, not `home.component.ts`. Every detector that discovered
 * components with `file.includes('.component.')` therefore reported "No Angular
 * components found" on a correct modern app, and false-warned laws that had
 * nothing to warn about (FE finding, the modern-Angular blindness class).
 *
 * The `.component.ts` fast path is kept (a match by name skips the file read);
 * anything else is confirmed by reading the file and looking for `@Component(`.
 * Spec files are excluded.
 */
export class AngularComponentFiles {
  static find(projectRoot: string, config: RuleOfCodeConfig): string[] {
    return CheckerUtils.findAngularFiles(projectRoot, config).filter(file =>
      this.isComponentFile(file)
    );
  }

  /** True when `file` is an Angular component (.component.ts, or @Component inside). */
  static isComponentFile(file: string): boolean {
    if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) {
      return false;
    }
    if (file.includes('.component.ts')) {
      return true;
    }
    try {
      return COMPONENT_DECORATOR.test(FileUtils.readFile(file));
    } catch (_error) {
      return false;
    }
  }

  /**
   * True when a file's already-read CONTENT is an Angular component. Use this in
   * a loop that has the content in hand, to avoid re-reading the file.
   */
  static isComponentContent(file: string, content: string): boolean {
    if (file.endsWith('.spec.ts')) {
      return false;
    }
    return file.includes('.component.ts') || COMPONENT_DECORATOR.test(content);
  }
}
