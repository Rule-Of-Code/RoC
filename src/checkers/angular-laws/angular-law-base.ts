/**
 * Angular Law Base Class
 * Base functionality for Angular-specific law implementations
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { LawBase } from '../law-base';

export class AngularLawBase extends LawBase {
  protected static hasAngularProject(projectRoot: string): boolean {
    return ProjectTypeDetector.isAngularProject(projectRoot);
  }

  protected static hasNgrxStore(projectRoot: string): boolean {
    return ProjectTypeDetector.hasPackageDependency(projectRoot, [
      '@ngrx/store',
    ]);
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
   * Create early return for Angular requirement check
   * Used when a law requires Angular to be present
   */
  protected static createAngularRequiredResult(
    lawName: string,
    projectRoot: string,
    checkMethod: (projectRoot: string) => boolean,
    context: LawCheckContext
  ): LawResult | null {
    if (!checkMethod(projectRoot)) {
      return this.createResult([], lawName, 'ANGULAR_LAW', [], context);
    }
    return null;
  }
}
