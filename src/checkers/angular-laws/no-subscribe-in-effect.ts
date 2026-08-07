/**
 * No Subscribe In Effect Law
 * `effect()` is for reacting to signal changes, not for orchestrating one-shot
 * async (data loading). A `.subscribe(` or `.then(` inside an effect body is a
 * smell — use toSignal()/rxResource() or an explicit lifecycle method instead.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class NoSubscribeInEffectLaw extends AngularLawBase {
  // `effect(` whose body (within a bounded window) contains .subscribe(/.then(.
  private static readonly SUBSCRIBE_IN_EFFECT =
    /\beffect\s*\(\s*(?:\([^)]*\)\s*=>)?[\s\S]{0,300}?\.(subscribe|then)\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    ).filter(
      f => f.endsWith('.component.ts') || f.endsWith('.directive.ts') || f.endsWith('.service.ts')
    );

    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const matches = code.match(this.SUBSCRIBE_IN_EFFECT);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } effect() with .subscribe()/.then() inside — use toSignal()/rxResource() or a lifecycle method, not effect().`
        );
      }
    }

    return this.createResult(
      violations,
      'No Subscribe In Effect',
      'ANGULAR_LAW',
      [
        'Use toSignal()/rxResource() for async data instead of subscribing in effect()',
        'effect() should react to signal changes, not orchestrate one-shot async',
      ],
      context
    );
  }
}
