/**
 * Generic Angular Law
 * Covers general Angular best practices and standards
 */

import { AngularComponentFiles } from '../../utils/angular-component-files';
import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';
export class GenericAngularLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const violations: string[] = [];
    const safeConfig = config;

    // Only check if Angular project
    const earlyReturn = this.createAngularRequiredResult(
      'Generic Angular Standards',
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (earlyReturn) return earlyReturn;

    // Check Angular version compatibility
    const angularVersion = this.getAngularVersion(projectRoot);
    if (angularVersion && this.isOutdatedVersion(angularVersion)) {
      violations.push(
        `Angular version ${angularVersion} is outdated - consider upgrading`
      );
    }

    // Find all Angular source files
    const sourceFiles = this.findAngularSourceFiles(projectRoot, safeConfig);

    for (const file of sourceFiles) {
      const content = FileUtils.readFile(file);
      const relativePath = PathOperations.getRelative(projectRoot, file);

      // Check component-specific standards. By @Component, not the filename —
      // an Angular-20 short-named component (home.ts) would otherwise skip these.
      if (AngularComponentFiles.isComponentContent(file, content)) {
        this.checkComponentStandards(content, relativePath, violations);
      }

      // Check service-specific standards. By @Injectable, not the filename — an
      // Angular-20 suffix-less service (user.ts) would otherwise skip these.
      if (file.includes('.service.ts') || /@Injectable\s*\(/.test(content)) {
        this.checkServiceStandards(content, relativePath, violations);
      }

      // Check module-specific standards. By @NgModule, not the filename.
      if (file.includes('.module.ts') || /@NgModule\s*\(/.test(content)) {
        this.checkModuleStandards(content, relativePath, violations);
      }

      // Check general TypeScript/Angular standards
      this.checkGeneralStandards(content, relativePath, violations);
    }

    return this.createResult(
      violations,
      'Generic Angular Standards',
      'ANGULAR_LAW',
      [
        'Follow Angular style guide',
        'Use proper lifecycle hooks',
        'Implement OnDestroy for cleanup',
        'Use proper change detection strategy',
        'CodeNamingAnalyzer: Follow naming conventions',
      ],
      context
    );
  }

  private static checkComponentStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    // Check for OnDestroy implementation
    if (content.includes('subscribe') && !content.includes('OnDestroy')) {
      violations.push(
        `Component ${filePath} has subscriptions but doesn't implement OnDestroy`
      );
    }

    // Check for proper change detection strategy
    if (!content.includes('ChangeDetectionStrategy')) {
      violations.push(
        `Component ${filePath} should specify ChangeDetectionStrategy`
      );
    }

    // Check for proper component decorator
    if (!content.includes('@Component')) {
      violations.push(`File ${filePath} is missing @Component decorator`);
    }

    // Check for template/templateUrl
    if (
      content.includes('@Component') &&
      !content.includes('template') &&
      !content.includes('templateUrl')
    ) {
      violations.push(`Component ${filePath} missing template or templateUrl`);
    }
  }

  private static checkServiceStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    // Check for Injectable decorator
    if (!content.includes('@Injectable')) {
      violations.push(`Service ${filePath} is missing @Injectable decorator`);
    }

    // Check for proper singleton pattern (providedIn: 'root')
    if (content.includes('@Injectable') && !content.includes('providedIn')) {
      violations.push(
        `Service ${filePath} should specify providedIn for proper DI`
      );
    }
  }

  private static checkModuleStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    // Check for NgModule decorator
    if (!content.includes('@NgModule')) {
      violations.push(`Module ${filePath} is missing @NgModule decorator`);
    }

    // Check for proper module structure
    if (
      content.includes('@NgModule') &&
      !content.includes('declarations') &&
      !content.includes('imports') &&
      !content.includes('providers')
    ) {
      violations.push(`Module ${filePath} has empty NgModule configuration`);
    }
  }

  private static checkGeneralStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    // Check for proper imports
    if (content.includes('rxjs') && content.includes('rxjs/operators')) {
      violations.push(
        `File ${filePath} uses deprecated rxjs/operators imports - use rxjs directly`
      );
    }

    // Console statements are owned by the dedicated Centralized Logging law
    // (centralized-logging) as of v7.2.0 — handled there with the full method set
    // and a logger/main.ts allowlist, so it is no longer checked here (no double
    // / contradictory flagging).

    // Check for any usage
    const anyUsage = content.match(/:\s*any\b/g);
    if (anyUsage && anyUsage.length > 2) {
      violations.push(
        `File ${filePath} has excessive 'any' usage (${anyUsage.length}) - improve typing`
      );
    }

    // Check for proper file naming
    const fileName = PathOperations.getBasename(filePath);
    if (
      !fileName.match(
        /^[a-z0-9-]+\.(component|service|module|pipe|directive|guard)\.ts$/
      )
    ) {
      violations.push(
        `FileNamingAnalyzer: File ${filePath} doesn't follow Angular naming conventions`
      );
    }
  }

  private static isOutdatedVersion(version: string): boolean {
    const versionNumber = parseFloat(version.replace(/[^0-9.]/g, ''));
    return versionNumber < 16.0; // Versions below 16 are considered outdated
  }

  private static findAngularSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const allFiles = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      config,
      'angular-generic',
      false
    );
    return allFiles.filter((file: string) => {
      // Suffix fast path (component/service/module/guard/pipe/directive.ts)...
      if (this.isAngularSourceFile(file)) {
        return true;
      }
      // ...plus Angular-20 suffix-less files, recognised by their decorator, so
      // a `user.ts` service or `home.ts` component still reaches the per-file
      // standards gates below.
      if (file.endsWith('.spec.ts')) {
        return false;
      }
      try {
        return /@(Component|Injectable|Directive|Pipe|NgModule)\s*\(/.test(
          FileUtils.readFile(file)
        );
      } catch (_error) {
        return false;
      }
    });
  }
}
