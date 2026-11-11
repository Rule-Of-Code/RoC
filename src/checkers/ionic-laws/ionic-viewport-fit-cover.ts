/**
 * Ionic Viewport Fit Cover
 *
 * @ionic/core's css/core.css sets `--ion-safe-area-top|right|bottom|left` to
 * `var(--safe-area-inset-*, env(safe-area-inset-*))`, and ion-header,
 * ion-footer and ion-tab-bar pad themselves with those. `env(safe-area-inset-*)`
 * carries the notch and home-indicator insets only when the page asked to
 * cover the display with `viewport-fit=cover`; without it the WebView
 * letterboxes the page and every safe-area rule is inert. Capacitor's Android
 * SystemBars plugin reads the same tag: it injects the `--safe-area-inset-*`
 * fallback and passes the insets through only when the LAST
 * `<meta name="viewport">` contains `viewport-fit=cover`
 * (capacitorSystemBarsCheckMetaViewport), and pads the WebView natively
 * otherwise.
 *
 * The tag lives in index.html, outside every TypeScript and template scan.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AppIndexes } from '../../utils/ionic/app-index';
import { HtmlTemplate, type TemplateElement } from '../../utils/ionic/html-template';
import { withNotes } from '../../utils/ionic/law-notes';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

const PINCH_ZOOM_COST = 'disables pinch-zoom — an accessibility cost; keep it only by decision';

export class IonicViewportFitCoverLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Viewport Fit Cover';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const notes: string[] = [];
    const indexes = AppIndexes.find(context.projectRoot);
    if (indexes.length === 0) {
      violations.push(
        'no index.html found (no angular.json / project.json build target names one, and none at index.html, src/index.html or public/index.html) — the viewport meta was NOT read'
      );
    }
    for (const index of indexes) {
      const where = PathOperations.getRelative(context.projectRoot, index.file).replace(/\\/g, '/');
      let text: string;
      try {
        text = fs.readFileSync(index.file, 'utf8');
      } catch {
        violations.push(`${where}: named by ${index.declaredIn} but could not be read — the viewport meta was NOT read`);
        continue;
      }
      const verdict = this.judge(where, text);
      violations.push(...verdict.violations);
      notes.push(...verdict.notes);
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Declare <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> in the index.html the build uses',
        'Keep pinch-zoom enabled unless you decided otherwise',
      ],
      context
    );
    return withNotes(result, notes);
  }

  /** The verdict on one index file's text. */
  static judge(where: string, text: string): { violations: string[]; notes: string[] } {
    const metas = HtmlTemplate.elements(text).filter(
      element =>
        element.tag === 'meta' &&
        HtmlTemplate.attribute(element, 'name')?.value?.trim().toLowerCase() === 'viewport'
    );
    // Browsers and Capacitor's SystemBars both act on the last viewport meta.
    const meta: TemplateElement | undefined = metas[metas.length - 1];
    if (!meta) {
      return {
        violations: [
          `${where}: no <meta name="viewport"> — env(safe-area-inset-*) stays 0 on notched devices, so --ion-safe-area-* and every safe-area rule are inert. Add one with viewport-fit=cover`,
        ],
        notes: [],
      };
    }
    const content = this.content(HtmlTemplate.attribute(meta, 'content')?.value ?? '');
    const violations =
      content.get('viewport-fit') === 'cover'
        ? []
        : [
            `${where}:${meta.line}: <meta name="viewport"> has no viewport-fit=cover — the WebView letterboxes the page and env(safe-area-inset-*) is 0, so --ion-safe-area-* and every safe-area rule are inert`,
          ];
    const notes: string[] = [];
    if (content.get('user-scalable') === 'no' || content.get('user-scalable') === '0') {
      notes.push(`${where}:${meta.line}: user-scalable=no ${PINCH_ZOOM_COST}`);
    }
    const maximumScale = content.get('maximum-scale');
    if (maximumScale !== undefined && Number(maximumScale) <= 1) {
      notes.push(`${where}:${meta.line}: maximum-scale=${maximumScale} ${PINCH_ZOOM_COST}`);
    }
    return { violations, notes };
  }

  /** `width=device-width, viewport-fit=cover` → key/value, lower-cased. */
  private static content(value: string): Map<string, string> {
    const pairs = new Map<string, string>();
    for (const part of value.split(/[,;]/)) {
      const [key, val] = part.split('=').map(piece => piece.trim().toLowerCase());
      if (key) pairs.set(key, val ?? '');
    }
    return pairs;
  }
}
