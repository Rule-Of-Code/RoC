/**
 * Functional IO and Query API Law
 * Locks in the modern Angular (17.1+/20) functional API: inputs/outputs/queries
 * must use input()/output()/viewChild()/viewChildren()/contentChild()/
 * contentChildren() — the legacy @Input/@Output/@ViewChild/... decorators must
 * not be (re)introduced.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class FunctionalIoQueryApiLaw extends AngularLawBase {
  private static readonly DECORATOR =
    /@(Input|Output|ViewChild|ViewChildren|ContentChild|ContentChildren)\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    ).filter(
      f => f.endsWith('.component.ts') || f.endsWith('.directive.ts')
    );

    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const matches = code.match(this.DECORATOR);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } legacy decorator(s) (@Input/@Output/@ViewChild/…) — use the functional API input()/output()/viewChild()/contentChild().`
        );
      }
    }

    return this.createResult(
      violations,
      'Functional IO and Query API',
      'ANGULAR_LAW',
      [
        'Replace @Input/@Output with input()/output()',
        'Replace @ViewChild(ren)/@ContentChild(ren) with viewChild(ren)()/contentChild(ren)()',
      ],
      context
    );
  }
}
