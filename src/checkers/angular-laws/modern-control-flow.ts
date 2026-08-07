/**
 * Modern Angular Control Flow Law
 * Enforces use of @if/@for instead of *ngIf/*ngFor in Angular 18+
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class ModernAngularControlFlowLaw extends AngularLawBase {
  private static readonly LAW_NAME = 'Modern Angular Control Flow';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const violations: string[] = [];
    const safeConfig = config;

    // Only check if Angular project
    const earlyReturn = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (earlyReturn) return earlyReturn;

    // Check Angular version - this law only applies to Angular 18+
    const angularVersion = this.getAngularVersion(projectRoot);
    if (!angularVersion || !this.isAngular18Plus(angularVersion)) {
      return this.createResult(
        [],
        this.LAW_NAME,
        'ANGULAR_LAW',
        [],
        context
      );
    }

    // Find all Angular template files
    const templateFiles = this.findTemplateFiles(projectRoot, safeConfig);

    for (const file of templateFiles) {
      const content = FileUtils.readFile(file);
      const relativePath = PathOperations.getRelative(projectRoot, file);

      // Check for legacy control flow syntax
      if (content.includes('*ngIf')) {
        violations.push(
          `Legacy *ngIf found in ${relativePath} - use @if instead`
        );
      }

      if (content.includes('*ngFor')) {
        violations.push(
          `Legacy *ngFor found in ${relativePath} - use @for instead`
        );
      }

      if (content.includes('*ngSwitch')) {
        violations.push(
          `Legacy *ngSwitch found in ${relativePath} - use @switch instead`
        );
      }

      // Check for mixed usage (partially migrated files)
      if (
        (content.includes('@if') || content.includes('@for')) &&
        (content.includes('*ngIf') || content.includes('*ngFor'))
      ) {
        violations.push(
          `Mixed control flow syntax in ${relativePath} - complete migration to @ syntax`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Replace *ngIf with @if',
        'Replace *ngFor with @for',
        'Replace *ngSwitch with @switch',
        'Complete migration in partially updated files',
      ],
      context
    );
  }

  private static isAngular18Plus(version: string): boolean {
    const versionNumber = parseFloat(version.replace(/[^0-9.]/g, ''));
    return versionNumber >= 18.0;
  }

  private static findTemplateFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find template files with proper ignore handling
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().ANGULAR,
      config
    );
  }
}
