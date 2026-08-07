/**
 * Prefer Union Over Enum Law
 * Discourages TypeScript `enum` declarations in favour of string-union literal
 * types, which are lighter (no runtime artifact), tree-shakeable and idiomatic.
 * A genuine need for runtime iteration can be opted out per-declaration with a
 * `// roc-allow-enum` justification comment.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class PreferUnionOverEnumLaw extends CodeQualityLawBase {
  private static readonly ENUM_DECL =
    /^\s*(?:export\s+)?(?:declare\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/;
  private static readonly JUSTIFICATION = /roc-allow-enum/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    const allowJustification =
      context.config.thresholds?.typescript?.allowEnumWithJustification !==
      false; // default: true

    const files = this.findTypeScriptFiles(projectRoot, context);
    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const relativePath = PathOperations.getRelative(projectRoot, file);

      const lines = content.split('\n');
      let inBlockComment = false;
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Track multi-line block comments so an `enum` mentioned in prose is not
        // flagged.
        if (inBlockComment) {
          if (trimmed.includes('*/')) inBlockComment = false;
          return;
        }
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
          inBlockComment = true;
          return;
        }

        // Strip a trailing line-comment before matching the declaration.
        const code = line.replace(/\/\/.*$/, '');
        const match = this.ENUM_DECL.exec(code);
        if (!match) return;

        const justified =
          allowJustification &&
          (this.JUSTIFICATION.test(line) ||
            (index > 0 && this.JUSTIFICATION.test(lines[index - 1] ?? '')));
        if (justified) return;

        violations.push(
          `Enum declaration '${match[1]}' in ${relativePath}:${
            index + 1
          } — prefer a string-union literal type (e.g. type X = 'a' | 'b'). If runtime iteration is required, add a // roc-allow-enum justification.`
        );
      });
    }

    return this.createResult(
      violations,
      'Prefer Union Over Enum',
      'CODE_QUALITY_LAW',
      [
        'Replace enums with string-union literal types',
        'Keep an enum only with a // roc-allow-enum justification (e.g. runtime iteration)',
      ],
      context
    );
  }
}
