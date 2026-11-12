import type { RuleOfCodeConfig } from '../types';
import { CheckerUtils } from './checker-utils';
import { FileUtils } from './file-utils';

/** A file carries an Angular component when it applies the @Component decorator. */
const COMPONENT_DECORATOR = /@Component\s*\(/;

/** The pre-Angular-20 component file suffix. */
const COMPONENT_SUFFIX = '.component.ts';

/** The Angular class kinds a law may scope itself to. */
export type AngularKind = 'component' | 'directive' | 'guard' | 'module' | 'pipe' | 'service';

/**
 * Each kind's pre-20 file suffix and the code that makes a file that kind
 * whatever its name. A functional guard has no decorator: its type does.
 */
const ANGULAR_KINDS: Record<AngularKind, { suffix: string; decorator: RegExp }> = {
  component: { suffix: COMPONENT_SUFFIX, decorator: COMPONENT_DECORATOR },
  directive: { suffix: '.directive.ts', decorator: /@Directive\s*\(/ },
  service: { suffix: '.service.ts', decorator: /@Injectable\s*\(/ },
  pipe: { suffix: '.pipe.ts', decorator: /@Pipe\s*\(/ },
  module: { suffix: '.module.ts', decorator: /@NgModule\s*\(/ },
  guard: {
    suffix: '.guard.ts',
    decorator: /\b(?:CanActivate|CanActivateChild|CanDeactivate|CanMatch)(?:Fn)?\b/,
  },
};

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
    if (file.includes(COMPONENT_SUFFIX)) {
      return true;
    }
    try {
      return COMPONENT_DECORATOR.test(FileUtils.readFile(file));
    } catch (_error) {
      return false;
    }
  }

  /**
   * True when `file` is an Angular class of one of `kinds` — by its suffix (the
   * pre-20 convention, a fast path) or by the decorator inside (Angular 20's
   * `hero.ts`, `highlight.ts`, `user-service.ts`). Tests and declarations are
   * never sources. The laws that picked their files with
   * `endsWith('.component.ts')` passed every Angular 20 app in silence (#330).
   */
  static isKind(file: string, kinds: readonly AngularKind[]): boolean {
    if (!file.endsWith('.ts') || /\.(?:spec|test)\.ts$/.test(file) || file.endsWith('.d.ts')) {
      return false;
    }
    if (kinds.some(kind => file.endsWith(ANGULAR_KINDS[kind].suffix))) return true;
    let content: string;
    try {
      content = FileUtils.readFile(file);
    } catch (_error) {
      return false;
    }
    return kinds.some(kind => ANGULAR_KINDS[kind].decorator.test(content));
  }

  /**
   * True when a file's already-read CONTENT is an Angular component. Use this in
   * a loop that has the content in hand, to avoid re-reading the file.
   */
  static isComponentContent(file: string, content: string): boolean {
    if (file.endsWith('.spec.ts')) {
      return false;
    }
    return file.includes(COMPONENT_SUFFIX) || COMPONENT_DECORATOR.test(content);
  }
}
