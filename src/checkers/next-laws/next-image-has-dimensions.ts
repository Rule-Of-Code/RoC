/**
 * Next Image Has Dimensions
 *
 * An image whose box is unknown until it downloads pushes everything below
 * it down when it arrives — layout shift, the CLS of Core Web Vitals. The
 * browser reserves the box from `width` and `height`. next/image requires
 * both unless the image is statically imported (the build reads its size) or
 * has `fill` (it fills a positioned parent) — Next 16 throws "missing
 * required width" at render otherwise, but only for the image that rendered.
 * A plain `<img>` has no such guard.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { importedNames } from '../../utils/react/next-app-files';
import { ReactProject } from '../../utils/react/react-project';
import { jsxAttribute, type JsxElementInfo, type TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const NEXT_IMAGE_MODULES = ['next/image', 'next/legacy/image'];
/** A module the bundler turns into static image data with its size. */
const STATIC_IMAGE = /\.(?:png|jpe?g|gif|webp|avif|ico|bmp|svg)$/i;

export class NextImageHasDimensionsLaw extends LawBase {
  static readonly LAW_NAME = 'Next Image Has Dimensions';

  static check(context: LawCheckContext): LawResult {
    const files = ReactProject.sourceFiles(context, ['.tsx', '.jsx', '.js']);
    const { sources, unread } = ReactProject.parse(context, files);
    const violations = [...unread];
    for (const source of sources) violations.push(...this.checkSource(context, source));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Give every <img> its intrinsic width and height; CSS still sets the rendered size',
        'next/image: pass width and height, import the image statically, or use fill inside a positioned parent',
      ],
      context
    );
  }

  static checkSource(context: LawCheckContext, source: TsxSource): string[] {
    const imageTags = importedNames(source, NEXT_IMAGE_MODULES, 'default');
    const staticImages = this.staticImageNames(source);
    const where = ReactProject.relative(context, source.fileName);
    const violations: string[] = [];
    for (const element of source.jsxElements()) {
      const isImg = element.tag === 'img';
      if (!isImg && !imageTags.has(element.tag)) continue;
      const problem = isImg ? this.imgProblem(element) : this.imageProblem(element, staticImages);
      if (problem) violations.push(`${where}:${element.line}: ${problem}`);
    }
    return violations;
  }

  /** Default-imported names of image files: `import hero from './hero.png'`. */
  private static staticImageNames(source: TsxSource): Set<string> {
    const names = new Set<string>();
    for (const info of source.imports()) {
      if (info.defaultName && STATIC_IMAGE.test(info.module)) names.add(info.defaultName);
    }
    return names;
  }

  private static missing(element: JsxElementInfo): string[] {
    return ['width', 'height'].filter(name => !jsxAttribute(element, name));
  }

  private static spreadNote(element: JsxElementInfo): string {
    return element.hasSpread
      ? ' (a {...spread} may set them, but this file cannot show it — pass them explicitly)'
      : '';
  }

  private static imgProblem(element: JsxElementInfo): string | null {
    const missing = this.missing(element);
    if (missing.length === 0) return null;
    return `<img> without ${missing.join(' and ')}${this.spreadNote(element)} — the browser cannot reserve its box, so the layout shifts when it loads`;
  }

  private static imageProblem(element: JsxElementInfo, staticImages: Set<string>): string | null {
    const missing = this.missing(element);
    if (missing.length === 0) return null;
    const fill = jsxAttribute(element, 'fill');
    if (fill && !(fill.kind === 'expression' && fill.value === 'false')) return null;
    // next/legacy/image spells fill as layout="fill".
    if (jsxAttribute(element, 'layout')?.value === 'fill') return null;
    const src = jsxAttribute(element, 'src');
    if (src?.kind === 'expression' && staticImages.has(src.value)) return null;
    return `<${element.tag}> without ${missing.join(' and ')}, fill or a statically imported src${this.spreadNote(element)} — next/image throws for it at render and the box is not reserved`;
  }
}
