/**
 * Web Storage Encapsulation Law
 * Direct localStorage/sessionStorage access must be encapsulated inside a service
 * (`*.service.ts`). Scattering web-storage calls across components/guards spreads
 * persistence (and sometimes credential material) and makes it untestable and
 * unmockable.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { FileUtils } from '../../utils/file-utils';
import { CodeQualityLawBase } from './code-quality-law-base';

export class WebStorageEncapsulationLaw extends CodeQualityLawBase {
  private static readonly WEB_STORAGE = /\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem|clear|key)\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    for (const file of this.findTypeScriptFiles(projectRoot, context)) {
      // Storage access is allowed inside services (the encapsulation boundary).
      if (/\.service\.ts$/.test(file.replace(/\\/g, '/'))) continue;

      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = this.stripComments(content);
      const matches = code.match(this.WEB_STORAGE);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } direct localStorage/sessionStorage call(s) — wrap web storage in a *.service.ts.`
        );
      }
    }

    return this.createResult(
      violations,
      'Web Storage Encapsulation',
      'CODE_QUALITY_LAW',
      [
        'Move localStorage/sessionStorage access into a dedicated storage service',
        'Inject that service where persistence is needed',
      ],
      context
    );
  }
}
