/**
 * ROC-FE-08 — No CSS transition/animation on a layout property
 * Animating a layout property (width/height/top/left/right/bottom/margin/padding)
 * triggers a per-frame reflow; only `transform`/`opacity` are GPU-composited. A
 * `transition`/`transition-property` that names a layout property is flagged.
 */

import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { FileFilterUtils } from '../../utils/file-filter-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class NoLayoutTransitionLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'No Layout Transition';
  private static readonly TRANSITION = /\btransition(?:-property)?\s*:\s*([^;{}]*)/i;
  private static readonly LAYOUT_PROP =
    /\b(width|height|top|left|right|bottom|margin|padding|inset)\b/i;

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

    const files = glob.sync('**/*.{scss,css}', {
      cwd: projectRoot,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.nx/**',
        '**/.angular/**',
        '**/packages/ruleofcode/**',
      ],
    });
    // Honour config.ignores (global + byRule by title-slug) without the
    // include-pattern bias of shouldIgnoreFile (which assumes TS/JS sources).
    const ignorePatterns = FileFilterUtils.getIgnorePatterns(config);
    const isIgnored = (abs: string): boolean => {
      const rel = PathOperations.getRelative(projectRoot, abs).replace(/\\/g, '/');
      return ignorePatterns.some(p => minimatch(abs, p) || minimatch(rel, p));
    };

    for (const file of files) {
      if (isIgnored(file)) continue;
      const content = FileUtils.readFile(file);
      if (!content || !content.includes('transition')) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      const lines = content.split(/\r\n|\r|\n/);

      for (let i = 0; i < lines.length; i++) {
        const m = (lines[i] ?? '').match(this.TRANSITION);
        if (m && this.LAYOUT_PROP.test(m[1] ?? '')) {
          const prop = (m[1] ?? '').match(this.LAYOUT_PROP)?.[0];
          violations.push(
            `${rel}:${i + 1}: transition animates a layout property (${prop}) — animate transform/opacity instead (GPU-composited, no reflow)`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Animate transform/opacity instead of width/height/top/left/…',
        'Use transform: scale()/translate() for size/position changes',
      ],
      context
    );
  }
}
