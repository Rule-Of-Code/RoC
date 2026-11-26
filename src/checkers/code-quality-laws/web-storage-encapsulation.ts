/**
 * Web Storage Encapsulation Law
 * Direct localStorage/sessionStorage access must be encapsulated inside a service
 * (`*.service.ts`). Scattering web-storage calls across components/guards spreads
 * persistence (and sometimes credential material) and makes it untestable and
 * unmockable.
 */

import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { FileUtils } from '../../utils/file-utils';
import { CodeQualityLawBase } from './code-quality-law-base';
import { scriptText } from '../../utils/vue/vue-sfc';

export class WebStorageEncapsulationLaw extends CodeQualityLawBase {
  private static readonly WEB_STORAGE =
    /\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem|clear|key)\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    // Each call behind a file's count, at its line (#43).
    const details: ViolationDetail[] = [];

    for (const file of this.findTypeScriptFiles(projectRoot, context)) {
      // Storage access is allowed inside services (the encapsulation boundary).
      if (/\.service\.ts$/.test(file.replace(/\\/g, '/'))) continue;

      // A .vue file is judged by its script (#607).
      const content = scriptText(
        file,
        FileUtils.readFileContentSync(file) ?? ''
      );
      if (!content.trim()) continue;
      const code = this.stripComments(content);
      const matches = code.match(this.WEB_STORAGE);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } direct localStorage/sessionStorage call(s) — wrap web storage in a *.service.ts.`
        );
        // The same calls, on a copy whose block comments keep their line
        // breaks, so each detail points at the call's own line.
        details.push(
          ...this.matchDetails(
            this.blankComments(content),
            this.WEB_STORAGE,
            PathOperations.getRelative(projectRoot, file),
            call => `direct web storage call ${call.replace(/\s+/g, '')}…)`
          )
        );
      }
    }

    const result = this.createResult(
      violations,
      'Web Storage Encapsulation',
      'CODE_QUALITY_LAW',
      [
        'Move localStorage/sessionStorage access into a dedicated storage service',
        'Inject that service where persistence is needed',
      ],
      context
    );
    return this.withDetails(result, details);
  }

  /** stripComments, with every comment blanked instead of removed: lines kept. */
  private static blankComments(content: string): string {
    const blank = (text: string): string => text.replace(/[^\n]/g, ' ');
    return content
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(
        /(^|[^:])(\/\/[^\n]*)/g,
        (_, before: string, comment: string) => before + blank(comment)
      );
  }
}
