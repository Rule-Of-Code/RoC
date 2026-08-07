/**
 * Inject Over Constructor DI Law
 * Modern Angular injects dependencies via the inject() function in a field
 * initializer. Constructor parameter-property DI (params with private/public/
 * protected/readonly modifiers) must not be (re)introduced — it composes poorly
 * with inheritance/mixins and is inconsistent with the rest of the codebase.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class InjectOverConstructorDiLaw extends AngularLawBase {
  // A constructor whose parameter list declares a parameter-property (access
  // modifier before a parameter name) = constructor DI.
  private static readonly CONSTRUCTOR = /constructor\s*\(([\s\S]*?)\)/g;
  private static readonly PARAM_PROPERTY =
    /\b(private|public|protected|readonly)\s+[A-Za-z_$]/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    ).filter(
      f =>
        f.endsWith('.component.ts') ||
        f.endsWith('.directive.ts') ||
        f.endsWith('.service.ts') ||
        f.endsWith('.pipe.ts') ||
        f.endsWith('.guard.ts')
    );

    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

      let count = 0;
      let match: RegExpExecArray | null;
      this.CONSTRUCTOR.lastIndex = 0;
      while ((match = this.CONSTRUCTOR.exec(code)) !== null) {
        if (this.PARAM_PROPERTY.test(match[1] ?? '')) count++;
      }
      if (count > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${count} constructor(s) using parameter-property DI — inject() in a field initializer instead.`
        );
      }
    }

    return this.createResult(
      violations,
      'Inject Over Constructor DI',
      'ANGULAR_LAW',
      [
        'Inject dependencies via inject() in a field initializer',
        'Avoid constructor parameter-property DI (private/public/protected/readonly params)',
      ],
      context
    );
  }
}
