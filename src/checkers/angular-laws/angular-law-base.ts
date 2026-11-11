/**
 * Angular Law Base Class
 * Base functionality for Angular-specific law implementations
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { declaredDependencies } from '../../utils/law-requirements';
import { LawBase } from '../law-base';

export class AngularLawBase extends LawBase {
  protected static hasAngularProject(projectRoot: string): boolean {
    return ProjectTypeDetector.isAngularProject(projectRoot);
  }

  /** Declared by any workspace manifest — the same reading as the `requires` gate. */
  protected static hasNgrxStore(projectRoot: string): boolean {
    return declaredDependencies(projectRoot).has('@ngrx/store');
  }

  protected static isAngularSourceFile(filePath: string): boolean {
    return (
      filePath.endsWith('.component.ts') ||
      filePath.endsWith('.service.ts') ||
      filePath.endsWith('.module.ts') ||
      filePath.endsWith('.guard.ts') ||
      filePath.endsWith('.pipe.ts') ||
      filePath.endsWith('.directive.ts')
    );
  }

  protected static getAngularVersion(projectRoot: string): string | null {
    return ProjectTypeDetector.getAngularVersion(projectRoot);
  }

  /**
   * The Angular major version, or null when it cannot be read.
   *
   * Several laws parsed this themselves, each slightly differently. A law whose
   * correctness depends on the version (standalone became the DEFAULT in v19)
   * must not guess: null means "unknown", and a caller that cannot tell the
   * version must not invent a finding from the ambiguity.
   */
  protected static getAngularMajor(projectRoot: string): number | null {
    const version = this.getAngularVersion(projectRoot);
    if (!version) {
      return null;
    }
    const major = parseInt(version.replace(/[^\d.]/g, '').split('.')[0] ?? '', 10);
    return Number.isNaN(major) ? null : major;
  }

  /**
   * The verdict of an Angular law whose subject is absent.
   *
   * The framework laws are gated by `requires`, so the engine does not select
   * them where Angular or NgRx is not declared, and this path is reached only
   * by a direct call. It used to return an empty result — score 100,
   * "compliance verified" — for a check that inspected nothing. It now says
   * that nothing was checked, and why.
   */
  protected static createAngularRequiredResult(
    lawName: string,
    projectRoot: string,
    checkMethod: (projectRoot: string) => boolean,
    context: LawCheckContext
  ): LawResult | null {
    if (checkMethod(projectRoot)) return null;
    return {
      lawName: lawName.toLowerCase().replace(/\s+/g, '-'),
      passed: true,
      message: `${lawName}: not applicable — the framework this law is about is not declared by any workspace package.json, so nothing was checked`,
      violations: [],
      suggestions: [],
      score: 100,
      config: context.config,
    };
  }
}
