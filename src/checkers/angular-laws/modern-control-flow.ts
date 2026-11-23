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

    // The syntax rules apply from Angular 18; the key of a repeated list
    // (`*ngFor` with a `trackBy`) matters on every version (#562).
    const angularVersion = this.getAngularVersion(projectRoot);
    if (!angularVersion || !this.isAngular18Plus(angularVersion)) {
      return this.checkTrackBy(context, safeConfig);
    }

    // Find all Angular template files
    const templateFiles = this.findTemplateFiles(projectRoot, safeConfig);

    for (const file of templateFiles) {
      violations.push(
        ...this.legacySyntaxIn(
          FileUtils.readFile(file),
          PathOperations.getRelative(projectRoot, file)
        )
      );
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

  /** The legacy control-flow syntax one template still uses (Angular 18+). */
  private static legacySyntaxIn(
    content: string,
    relativePath: string
  ): string[] {
    const found: string[] = [];
    if (content.includes('*ngIf')) {
      found.push(`Legacy *ngIf found in ${relativePath} - use @if instead`);
    }
    if (content.includes('*ngFor')) {
      found.push(`Legacy *ngFor found in ${relativePath} - use @for instead`);
    }
    if (content.includes('*ngSwitch')) {
      found.push(
        `Legacy *ngSwitch found in ${relativePath} - use @switch instead`
      );
    }
    // A partially migrated file mixes both syntaxes.
    if (
      (content.includes('@if') || content.includes('@for')) &&
      (content.includes('*ngIf') || content.includes('*ngFor'))
    ) {
      found.push(
        `Mixed control flow syntax in ${relativePath} - complete migration to @ syntax`
      );
    }
    return found;
  }

  /**
   * Below Angular 18 (or when the version does not parse) the syntax rules do
   * not apply; only a repeated list without a `trackBy` key is reported (#562).
   */
  private static checkTrackBy(
    context: LawCheckContext,
    config: RuleOfCodeConfig
  ): LawResult {
    const missing = this.templatesWithoutTrackBy(context.projectRoot, config);
    return this.createResult(
      missing.map(
        file =>
          `*ngFor without trackBy in ${file} - every change re-renders the whole list`
      ),
      this.LAW_NAME,
      'ANGULAR_LAW',
      missing.length > 0
        ? [
            'Add a trackBy function: *ngFor="let item of items; trackBy: trackById"',
          ]
        : [],
      context
    );
  }

  /**
   * HTML templates with an `*ngFor` and no `trackBy`, relative to the
   * project, comments removed. A `.old.` backup (`list.component.old.html`)
   * is not a live template (#369).
   */
  private static templatesWithoutTrackBy(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return CheckerUtils.findFilesByExtension(projectRoot, ['.html'], config)
      .filter(file => !PathOperations.getFilename(file).includes('.old.'))
      .filter(file => {
        const code = FileUtils.readFile(file).replace(/<!--[\s\S]*?-->/g, '');
        return code.includes('*ngFor') && !code.includes('trackBy');
      })
      .map(file => PathOperations.getRelative(projectRoot, file));
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
