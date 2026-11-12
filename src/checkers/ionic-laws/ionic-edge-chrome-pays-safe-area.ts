/**
 * Ionic Edge Chrome Pays Safe Area
 *
 * ion-header pays the top inset and ion-footer / ion-tab-bar the bottom one by
 * themselves (@ionic/core header.{ios,md}.css read --ion-safe-area-top;
 * footer and tab-bar read --ion-safe-area-bottom). A project that draws its
 * own top bar, bottom bar or sheet has to read the inset on the edge it
 * touches, and forgetting is invisible wherever a team usually looks: desktop
 * Chromium, device emulation and screenshot gates render with no status bar,
 * so the insets are 0 there.
 *
 * 1. Edge asymmetry (reliable): the project's CSS reads the bottom inset but
 *    never the top one while no template uses <ion-header> — or the reverse
 *    for the bottom edge without <ion-footer> / <ion-tab-bar>.
 * 2. Edge containers: either the closed list in
 *    `thresholds.ionic.edgeContainers` (each selector must be found, and the
 *    last padding / margin / offset declaration on its edge must read the
 *    inset), or — without the list — a heuristic: a class used by a template
 *    whose rule is `position: fixed|sticky` with `top: 0` (or `bottom: 0`),
 *    and no rule for that class reads the inset on that edge.
 *
 * Judged only where the viewport asks for viewport-fit=cover: without it the
 * insets are 0 anyway, and ionic-viewport-fit-cover reports that first.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents, type AngularComponent } from '../../utils/ionic/angular-components';
import { AppIndexes } from '../../utils/ionic/app-index';
import { CssRules, projectStyleSheets, type CssDeclaration, type CssRule, type StyleSheet } from '../../utils/ionic/css-rules';
import { HtmlTemplate } from '../../utils/ionic/html-template';
import { withNotes } from '../../utils/ionic/law-notes';
import { LawBase } from '../law-base';
import { IonicViewportFitCoverLaw } from './ionic-viewport-fit-cover';

type Edge = 'top' | 'bottom';

const INSET: Record<Edge, RegExp> = {
  top: /--ion-safe-area-top\b|safe-area-inset-top\b/,
  bottom: /--ion-safe-area-bottom\b|safe-area-inset-bottom\b/,
};

/** The properties that move content off an edge, grouped by what overrides what. */
const EDGE_GROUPS: Record<Edge, string[][]> = {
  top: [
    ['padding', 'padding-block', 'padding-top', 'padding-block-start'],
    ['margin', 'margin-block', 'margin-top', 'margin-block-start'],
    ['inset', 'inset-block', 'top', 'inset-block-start'],
  ],
  bottom: [
    ['padding', 'padding-block', 'padding-bottom', 'padding-block-end'],
    ['margin', 'margin-block', 'margin-bottom', 'margin-block-end'],
    ['inset', 'inset-block', 'bottom', 'inset-block-end'],
  ],
};

interface Located extends CssDeclaration {
  where: string;
  order: number;
}

export class IonicEdgeChromePaysSafeAreaLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Edge Chrome Pays Safe Area';

  static check(context: LawCheckContext): LawResult {
    if (!this.coversViewport(context.projectRoot)) {
      return withNotes(this.createResult([], this.LAW_NAME, 'FRAMEWORK', [], context), [
        'not judged: no index.html with viewport-fit=cover was found, so the insets are 0 everywhere — ionic-viewport-fit-cover reports that first',
      ]);
    }
    const scan = AngularComponents.scan(context);
    const styles = projectStyleSheets(context, scan.components.flatMap(c => c.styles));
    const violations = [...scan.unread, ...styles.unread];
    violations.push(...this.asymmetry(context, scan.components, styles.sheets));
    const declared = context.config.thresholds?.ionic?.edgeContainers;
    violations.push(
      ...(declared?.length
        ? this.declaredContainers(styles.sheets, declared)
        : this.inferredContainers(context, scan.components, styles.sheets))
    );
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Use ion-header / ion-footer, or make every self-drawn edge container read var(--ion-safe-area-<edge>) in its padding on that edge',
        'Keep the list of edge containers closed in thresholds.ionic.edgeContainers so a new one has to be declared',
      ],
      context
    );
  }

  private static coversViewport(projectRoot: string): boolean {
    return AppIndexes.find(projectRoot).some(index => {
      try {
        return IonicViewportFitCoverLaw.judge('', fs.readFileSync(index.file, 'utf8')).violations.length === 0;
      } catch {
        return false;
      }
    });
  }

  /** Every declaration of the project's CSS with where it is, in stylesheet order. */
  private static declarations(context: LawCheckContext, sheets: StyleSheet[]): Array<Located & { selector: string }> {
    let order = 0;
    return sheets.flatMap(sheet =>
      sheet.rules.flatMap(rule =>
        rule.declarations.map(d => ({
          ...d,
          selector: rule.selector,
          where: `${AngularComponents.relative(context, sheet.file)}:${d.line}`,
          order: order++,
        }))
      )
    ).sort((a, b) => a.order - b.order);
  }

  /** Part 1: one edge's inset read, the other never, and no Ionic element pays the other. */
  static asymmetry(context: LawCheckContext, components: AngularComponent[], sheets: StyleSheet[]): string[] {
    const all = this.declarations(context, sheets);
    const firstRead = (edge: Edge): Located | undefined => all.find(d => INSET[edge].test(d.value));
    const uses = (tags: string[]): boolean =>
      components.some(c => c.elements.some(element => tags.includes(element.tag)));
    const top = firstRead('top');
    const bottom = firstRead('bottom');
    const found: string[] = [];
    if (bottom && !top && !uses(['ion-header'])) {
      found.push(
        `${bottom.where}: the bottom inset is read here, but --ion-safe-area-top / safe-area-inset-top is read nowhere and no template uses <ion-header> — the project draws its own top edge and nothing pays the status bar, so content sits under it on an edge-to-edge device`
      );
    }
    if (top && !bottom && !uses(['ion-footer', 'ion-tab-bar'])) {
      found.push(
        `${top.where}: the top inset is read here, but --ion-safe-area-bottom / safe-area-inset-bottom is read nowhere and no template uses <ion-footer> / <ion-tab-bar> — the project draws its own bottom edge and nothing pays the gesture bar`
      );
    }
    return found;
  }

  /** Part 2, declared: each listed selector found, its last declaration on the edge reading the inset. */
  static declaredContainers(sheets: StyleSheet[], declared: Array<{ selector: string; edge: Edge }>): string[] {
    const normalize = (selector: string): string => selector.replace(/\s+/g, ' ').trim();
    return declared.flatMap(({ selector, edge }) => {
      const wanted = normalize(selector);
      const decls = sheets.flatMap(sheet =>
        sheet.rules
          .filter(rule => rule.selector.split(',').map(normalize).includes(wanted))
          .flatMap(rule => rule.declarations)
      );
      if (decls.length === 0) {
        return [
          `thresholds.ionic.edgeContainers: '${selector}' is not found in any stylesheet — a declared edge container must exist, or be removed from the list`,
        ];
      }
      if (this.paysEdge(decls, edge)) return [];
      return [
        `thresholds.ionic.edgeContainers: '${selector}' (${edge} edge) — its last padding / margin / ${edge} / inset declaration does not read --ion-safe-area-${edge}; on an edge-to-edge device it sits under the system bar`,
      ];
    });
  }

  /** True when, in some group, the LAST declaration (the one that wins) reads the inset. */
  private static paysEdge(decls: CssDeclaration[], edge: Edge): boolean {
    return EDGE_GROUPS[edge].some(group => {
      const last = decls.filter(d => group.includes(d.property)).pop();
      return Boolean(last && INSET[edge].test(last.value));
    });
  }

  /** Part 2, heuristic: fixed/sticky at top: 0 (bottom: 0), used by a template, never paying that edge. */
  static inferredContainers(context: LawCheckContext, components: AngularComponent[], sheets: StyleSheet[]): string[] {
    const used = this.classUses(context, components);
    const all = sheets.flatMap(sheet => sheet.rules.map(rule => ({ rule, sheet })));
    const cascadeOf = (name: string): CssDeclaration[] =>
      all
        .filter(other => CssRules.subjectClasses(other.rule.selector).includes(name))
        .flatMap(other => other.rule.declarations);
    const found = new Map<string, string>();
    for (const { rule, sheet } of all) {
      for (const { edge, position } of this.edgesPinned(rule)) {
        for (const name of CssRules.subjectClasses(rule.selector)) {
          const key = `${name}:${edge}`;
          const usedAt = used.get(name);
          if (!usedAt || found.has(key) || this.readsOnEdge(cascadeOf(name), edge)) continue;
          found.set(
            key,
            `${AngularComponents.relative(context, sheet.file)}:${rule.line}: .${name} (used at ${usedAt}) is ${position} at ${edge}: 0 and no rule for it reads --ion-safe-area-${edge} in its padding / margin / ${edge} / inset — a self-drawn edge container under the system bar on an edge-to-edge device (heuristic; declare the list in thresholds.ionic.edgeContainers)`
          );
        }
      }
    }
    return [...found.values()];
  }

  /** Class name → the first template line that uses it. */
  private static classUses(context: LawCheckContext, components: AngularComponent[]): Map<string, string> {
    const uses = new Map<string, string>();
    for (const component of components) {
      const file = AngularComponents.relative(context, component.template?.file ?? component.file);
      for (const element of component.elements) {
        for (const name of HtmlTemplate.classes(element)) {
          if (!uses.has(name)) uses.set(name, `${file}:${element.line}`);
        }
      }
    }
    return uses;
  }

  /** The edges a rule pins an element to: `position: fixed|sticky` with `top: 0` / `bottom: 0`. */
  private static edgesPinned(rule: CssRule): Array<{ edge: Edge; position: string }> {
    const position = rule.declarations.find(d => d.property === 'position')?.value.toLowerCase().split(/\s/)[0] ?? '';
    if (position !== 'fixed' && position !== 'sticky') return [];
    return (['top', 'bottom'] as Edge[])
      .filter(edge => rule.declarations.some(d => d.property === edge && /^0(?:px|rem|em|%)?$/.test(d.value.trim())))
      .map(edge => ({ edge, position }));
  }

  private static readsOnEdge(decls: CssDeclaration[], edge: Edge): boolean {
    const props = new Set(EDGE_GROUPS[edge].flat());
    return decls.some(d => props.has(d.property) && INSET[edge].test(d.value));
  }
}
