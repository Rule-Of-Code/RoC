/**
 * ROC-FE-06 — Defensive array coercion of a response property
 * Stops the "`.map` of a non-array" crash class on a partial/closed payload. A
 * `.map`/`.filter`/`.reduce` over a property of an HTTP-envelope parameter (a type
 * carrying the `Raw` marker token — crypto `Raw*` prefix or futures `FuturesRaw*`
 * infix) must be guarded with `Array.isArray(x) ? x : []` (or `coerceArray()`).
 * `?? []` is NOT enough — a non-array truthy value slips through.
 *
 * RoC has no type-checker, so the envelope is keyed by the TYPE-token in the
 * parameter annotation (per the FE naming convention), not by the param name.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { FeArchLawBase } from './fe-arch-law-base';

export class DefensiveArrayCoercionLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Defensive Array Coercion';
  // A parameter typed with the internal `Raw` token (RawX / FuturesRawX).
  private static readonly RAW_PARAM = /\(\s*(\w+)\s*:\s*[A-Za-z]*Raw[A-Z]\w*/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      const norm = file.replace(/\\/g, '/');
      if (!/\/data-access\//.test(norm)) continue; // mappers live in data-access
      const content = FileUtils.readFile(file);
      // "Raw" as an internal token (RawX prefix OR FuturesRawX infix) — no \b,
      // per the FE naming convention (else the futures infix form is missed).
      if (!content || !/Raw[A-Z]/.test(content)) continue;

      const params = new Set<string>();
      this.RAW_PARAM.lastIndex = 0;
      let pm: RegExpExecArray | null;
      while ((pm = this.RAW_PARAM.exec(content)) !== null) params.add(pm[1] ?? '');
      if (params.size === 0) continue;
      const rel = PathOperations.getRelative(projectRoot, file);

      for (const p of params) {
        // `p.prop.map(` or `p.prop ?? []).map(` — but NOT the Array.isArray form
        // (there the map receiver is `: []`, not `p.prop`).
        const bad = new RegExp(
          `\\b${p}\\.(\\w+)\\s*(?:\\?\\?\\s*\\[\\s*\\])?\\s*\\)?\\s*\\.\\s*(?:map|filter|reduce)\\s*\\(`,
          'g'
        );
        let m: RegExpExecArray | null;
        while ((m = bad.exec(content)) !== null) {
          const line = content.slice(0, m.index).split('\n').length;
          violations.push(
            `${rel}:${line}: unguarded array method on ${p}.${m[1]} — coerce with Array.isArray(x) ? x : [] (or coerceArray); ?? [] is not enough for a non-array truthy value`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Guard: (Array.isArray(r.items) ? r.items : []).map(...)',
        'Or a shared coerceArray() at the mapper boundary — not ?? []',
      ],
      context
    );
  }
}
