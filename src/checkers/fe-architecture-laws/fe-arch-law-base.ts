/**
 * Base for the FE architecture laws (from the frontend architecture audit).
 *
 * Most of these laws are framework-neutral: a CSS transition on `width`, a
 * feature gated on `location.hostname`, a store living in the feature layer
 * are the same defect in an Angular, React or Vue app. They are therefore not
 * gated on Angular any more — an Angular gate made them report "compliance
 * verified" on every other frontend without reading a file. The one that is
 * about Angular's lifecycle (Timer Cleanup) is gated by the card's `requires`.
 *
 * Several laws judge a LAYER: the feature layer, the data-access layer. Where
 * a project keeps them is its own business, so the layers are configurable
 * (`thresholds.frontend.featureLayers` / `dataAccessLayers`, globs relative to
 * the project root). Without configuration the Nx convention is used: a
 * `/feature*\/` or `/data-access/` directory. A layer law that finds NO file in
 * its layer has judged nothing, and says so as a violation instead of passing.
 */

import { minimatch } from 'minimatch';
import type { LawCheckContext } from '../../types/law.types';
import { DirectoryScanner } from '../../utils/directory-scanner';
import { PathOperations } from '../../utils/path-operations';
import type { TsxSource } from '../../utils/react/tsx-source';
import { AngularLawBase } from '../angular-laws/angular-law-base';

export type FeLayer = 'dataAccess' | 'feature';

interface LayerSpec {
  /** The config key under thresholds.frontend. */
  key: 'dataAccessLayers' | 'featureLayers';
  /** The default when the key is not set: a directory segment. */
  segment: RegExp;
  /** The default in words, for messages. */
  defaultText: string;
  name: string;
}

const LAYERS: Record<FeLayer, LayerSpec> = {
  feature: {
    key: 'featureLayers',
    segment: /\/feature[^/]*\//,
    defaultText: 'a /feature*/ directory',
    name: 'feature',
  },
  dataAccess: {
    key: 'dataAccessLayers',
    segment: /\/data-access\//,
    defaultText: 'a /data-access/ directory',
    name: 'data-access',
  },
};

/** Source a TS/TSX law scans: TypeScript, TSX and JSX, tests excluded. */
export const TS_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.jsx'];

export class FeArchLawBase extends AngularLawBase {
  /** The configured globs for a layer, or null when the default applies. */
  private static layerGlobs(context: LawCheckContext, layer: FeLayer): string[] | null {
    const frontend = context.config.thresholds?.frontend;
    const globs = frontend?.[LAYERS[layer].key];
    return Array.isArray(globs) && globs.length > 0 ? globs : null;
  }

  /** Whether `file` (absolute) is in `layer`. */
  protected static inLayer(context: LawCheckContext, file: string, layer: FeLayer): boolean {
    const globs = this.layerGlobs(context, layer);
    if (!globs) return LAYERS[layer].segment.test(file.replace(/\\/g, '/'));
    const rel = PathOperations.getRelative(context.projectRoot, file);
    return globs.some(glob => minimatch(rel, glob, { dot: true }));
  }

  /** Whether `file` is in the feature or the data-access layer (configurable). */
  protected static inFeatureOrDataAccess(context: LawCheckContext, file: string): boolean {
    return this.inLayer(context, file, 'feature') || this.inLayer(context, file, 'dataAccess');
  }

  /**
   * The fixed Nx-convention test, for the laws that do not take the layer
   * configuration (Poll Via Sanctioned Source).
   */
  protected static isFeatureOrDataAccess(normalizedPath: string): boolean {
    return (
      LAYERS.feature.segment.test(normalizedPath) ||
      LAYERS.dataAccess.segment.test(normalizedPath)
    );
  }

  /**
   * The violation a layer law gives when no scanned file is in its layer: it
   * judged nothing, and a pass would claim it had.
   */
  protected static emptyLayer(context: LawCheckContext, layers: FeLayer[]): string {
    const described = layers.map(layer => {
      const spec = LAYERS[layer];
      const globs = this.layerGlobs(context, layer);
      return globs
        ? `the ${spec.name} layer (thresholds.frontend.${spec.key}: ${globs.join(', ')})`
        : `the ${spec.name} layer (default: ${spec.defaultText})`;
    });
    const keys = layers.map(layer => `thresholds.frontend.${LAYERS[layer].key}`).join(' / ');
    return `no source file is in ${described.join(' or ')} — this law judged nothing. Declare where the layer lives in ${keys} (globs relative to the project root), or set the law to notApplicable with the reason`;
  }

  /** Non-test source with `extensions`, honouring ignores (incl. byRule for this law). */
  protected static sourceFiles(
    context: LawCheckContext,
    extensions: readonly string[] = TS_SOURCE_EXTENSIONS
  ): string[] {
    return DirectoryScanner.scanForFiles(
      context.projectRoot,
      context.config,
      [...extensions],
      context.lawId,
      false
    );
  }

  /**
   * Lines of every call to `imported` from `module`, through whatever local
   * name the file binds it to (`import { create as make } from 'zustand'`).
   * A type-only import binds nothing callable and is skipped.
   */
  protected static importedCallLines(
    source: TsxSource,
    module: string,
    imported: string
  ): number[] {
    const locals = new Set(
      source
        .imports()
        .filter(info => !info.typeOnly && info.module === module)
        .flatMap(info => info.named.filter(n => n.imported === imported).map(n => n.local))
    );
    if (locals.size === 0) return [];
    const ts = source.ts;
    const lines: number[] = [];
    source.walk(node => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        locals.has(node.expression.text)
      ) {
        lines.push(source.lineOf(node));
      }
    });
    return lines;
  }

  /** Text inside the `(...)` starting at index `open` (a `(`), handling nesting. */
  protected static readParens(s: string, open: number): string | null {
    return this.readBalanced(s, open, '(', ')');
  }

  /** Text inside the `{...}` starting at index `open` (a `{`), handling nesting. */
  protected static readBraces(s: string, open: number): string | null {
    return this.readBalanced(s, open, '{', '}');
  }

  private static readBalanced(
    s: string,
    open: number,
    o: string,
    c: string
  ): string | null {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === o) depth++;
      else if (s[i] === c) {
        depth--;
        if (depth === 0) return s.slice(open + 1, i);
      }
    }
    return null;
  }
}
