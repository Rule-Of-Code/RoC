/**
 * The performance evidence a React or Next.js codebase writes in its source,
 * read from the parse — never from a word in a comment.
 *
 * The performance laws looked for this evidence in Angular places only
 * (`main.ts`, `*.component.ts`, `src/index.html`), so a React app that splits
 * with `next/dynamic`, reports Web Vitals with `useReportWebVitals` and
 * preloads fonts through `next/font` had none of it as far as they could see.
 *
 * What counts, and why:
 * - lazy code: a call of the `next/dynamic` default import, of `React.lazy` /
 *   `lazy` from 'react', or a dynamic `import()` expression;
 * - Web Vitals reporting: a call of `useReportWebVitals` from
 *   'next/web-vitals', or of a metric function (`onLCP`, `onINP`, …) from
 *   'web-vitals' — an import that is never called reports nothing;
 * - images: `<Image>` from 'next/image' is served through Next's optimizer
 *   (default `formats: ['image/webp']`) unless it carries `unoptimized`, and is
 *   lazy unless it carries `priority`, `preload` or `loading="eager"`
 *   (`next/dist/shared/lib/get-img-props.js`); `<img loading="lazy">`;
 * - resource hints: `<link rel="preload|preconnect|dns-prefetch|prefetch|
 *   modulepreload">` in JSX; a `next/font` loader call (`preload` defaults to
 *   true in `@next/font`'s validators) unless it passes `preload: false`; a
 *   call of react-dom's `preload` / `preconnect` / `prefetchDNS` /
 *   `preloadModule` / `preinit` / `preinitModule`.
 *
 * The scan runs only where a workspace manifest declares `react` or `next`.
 * Files it could not read are returned in `unread`; a law that relies on this
 * scan reports them — files not read are not passed.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, RuleOfCodeConfig } from '../../types/law.types';
import { WorkspaceManifests } from '../workspace-manifests';
import { ReactProject } from './react-project';
import { type ImportInfo, type JsxElementInfo, jsxAttribute, type TsxSource } from './tsx-source';

const WEB_VITALS_FUNCTIONS = new Set([
  'onCLS',
  'onINP',
  'onLCP',
  'onFCP',
  'onTTFB',
  'onFID',
  'getCLS',
  'getFID',
  'getLCP',
  'getFCP',
  'getTTFB',
]);
const REACT_DOM_HINTS = new Set(['preload', 'preconnect', 'prefetchDNS', 'preloadModule', 'preinit', 'preinitModule']);
const LINK_HINTS = new Set(['preload', 'preconnect', 'dns-prefetch', 'prefetch', 'modulepreload']);
const NEXT_FONT_MODULES = new Set(['next/font/google', 'next/font/local']);
const NEXT_IMAGE = 'next/image';
const NEXT_DYNAMIC = 'next/dynamic';
const REACT_LAZY = 'React.lazy';

export interface ReactPerformanceEvidence {
  /** The project declares react or next, so the scan ran. */
  applies: boolean;
  /** Files that were not read (no parser, unreadable) — a law must report them. */
  unread: string[];
  /** `file:line (how)` for every lazy-code split. */
  dynamicImports: string[];
  webVitalsReports: string[];
  /** `<Image>` from next/image served through the optimizer. */
  optimizedImages: string[];
  /** Lazy `<Image>` and `<img loading="lazy">`. */
  lazyImages: string[];
  resourceHints: string[];
  /** `file:line module` for imports of the error-tracking modules asked about. */
  errorTrackingImports: string[];
}

/** What calling an imported function means: lazy code, Web Vitals, a resource hint. */
interface CallMeaning {
  kind: 'hint' | 'lazy' | 'vitals';
  label: string;
}

/** Local bindings per imported module, for one file. */
interface Bindings {
  /** Callee identifier → what calling it means. */
  calls: Map<string, CallMeaning>;
  /** Namespace identifier → module (for `React.lazy`, `ReactDOM.preload`, `wv.onLCP`). */
  namespaces: Map<string, string>;
  nextImage: string | null;
  fontLoaders: Set<string>;
}

function empty(applies: boolean): ReactPerformanceEvidence {
  return {
    applies,
    unread: [],
    dynamicImports: [],
    webVitalsReports: [],
    optimizedImages: [],
    lazyImages: [],
    resourceHints: [],
    errorTrackingImports: [],
  };
}

function isTrueAttribute(element: JsxElementInfo, name: string): boolean {
  const attribute = jsxAttribute(element, name);
  if (!attribute) return false;
  return attribute.kind === 'bare' || (attribute.kind === 'expression' && attribute.value === 'true');
}

function stringAttribute(element: JsxElementInfo, name: string): string | null {
  const attribute = jsxAttribute(element, name);
  return attribute?.kind === 'string' ? attribute.value : null;
}

/** The violation for files a law needed and could not read. */
export function unreadViolation(unread: readonly string[]): string {
  const shown = unread.slice(0, 5).join('; ');
  const more = unread.length > 5 ? ` (+${unread.length - 5} more)` : '';
  return `Source/config NOT read, so it could not be checked: ${shown}${more}`;
}

export class ReactPerformanceSource {
  /** The scan; `errorTrackingModules` are reported in `errorTrackingImports` when imported. */
  static scan(
    context: LawCheckContext,
    errorTrackingModules: readonly string[] = []
  ): ReactPerformanceEvidence {
    const root = context.projectRoot;
    if (!WorkspaceManifests.declares(root, 'react') && !WorkspaceManifests.declares(root, 'next')) {
      return empty(false);
    }
    const scanContext: LawCheckContext = {
      ...context,
      config: context.config ?? ({} as RuleOfCodeConfig),
    };
    const parsed = ReactProject.parse(scanContext, ReactProject.sourceFiles(scanContext));
    const evidence = empty(true);
    evidence.unread.push(...parsed.unread);
    for (const source of parsed.sources) {
      this.scanFile(scanContext, source, evidence, errorTrackingModules);
    }
    return evidence;
  }

  private static scanFile(
    context: LawCheckContext,
    source: TsxSource,
    evidence: ReactPerformanceEvidence,
    errorTrackingModules: readonly string[]
  ): void {
    const file = ReactProject.relative(context, source.fileName);
    const at = (line: number, what: string): string => `${file}:${line} ${what}`;
    const bindings = this.bindings(source);
    for (const info of source.imports()) {
      if (errorTrackingModules.includes(info.module)) {
        evidence.errorTrackingImports.push(at(info.line, info.module));
      }
    }
    this.scanCalls(source, bindings, evidence, at);
    this.scanJsx(source, bindings, evidence, at);
  }

  private static bindings(source: TsxSource): Bindings {
    const bindings: Bindings = {
      calls: new Map(),
      namespaces: new Map(),
      nextImage: null,
      fontLoaders: new Set(),
    };
    for (const info of source.imports()) {
      if (!info.typeOnly) this.bindImport(info, bindings);
    }
    return bindings;
  }

  private static bindImport(info: ImportInfo, bindings: Bindings): void {
    const { module, defaultName } = info;
    for (const name of [defaultName, info.namespaceName]) {
      if (name) bindings.namespaces.set(name, module);
    }
    if (module === NEXT_IMAGE && defaultName) bindings.nextImage = defaultName;
    if (module === NEXT_DYNAMIC && defaultName) {
      bindings.calls.set(defaultName, { kind: 'lazy', label: NEXT_DYNAMIC });
    }
    if (NEXT_FONT_MODULES.has(module)) {
      if (defaultName) bindings.fontLoaders.add(defaultName);
      for (const binding of info.named) bindings.fontLoaders.add(binding.local);
    }
    for (const binding of info.named) {
      const meaning = this.memberMeaning(module, binding.imported);
      if (meaning) bindings.calls.set(binding.local, meaning);
    }
  }

  /** What `module`'s export `member` means when called, if anything. */
  private static memberMeaning(module: string, member: string): CallMeaning | null {
    if (module === 'react' && member === 'lazy') return { kind: 'lazy', label: REACT_LAZY };
    if (module === 'next/web-vitals' && member === 'useReportWebVitals') {
      return { kind: 'vitals', label: 'useReportWebVitals' };
    }
    if (module === 'web-vitals' && WEB_VITALS_FUNCTIONS.has(member)) {
      return { kind: 'vitals', label: `web-vitals ${member}` };
    }
    if (module === 'react-dom' && REACT_DOM_HINTS.has(member)) {
      return { kind: 'hint', label: `react-dom ${member}` };
    }
    return null;
  }

  /** What a call means, from its callee: `name(...)` or `Namespace.member(...)`. */
  private static callMeaning(
    source: TsxSource,
    node: TS.CallExpression,
    bindings: Bindings
  ): CallMeaning | null {
    const ts = source.ts;
    const callee = node.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return { kind: 'lazy', label: 'import()' };
    if (ts.isIdentifier(callee)) {
      if (!bindings.fontLoaders.has(callee.text)) return bindings.calls.get(callee.text) ?? null;
      return this.fontPreloads(source, node) ? { kind: 'hint', label: 'next/font preload' } : null;
    }
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
      const module = bindings.namespaces.get(callee.expression.text);
      return module ? this.memberMeaning(module, callee.name.text) : null;
    }
    return null;
  }

  /** A next/font loader preloads unless its options say `preload: false`. */
  private static fontPreloads(source: TsxSource, node: TS.CallExpression): boolean {
    const ts = source.ts;
    const options = node.arguments[0];
    if (!options || !ts.isObjectLiteralExpression(options)) return true;
    return !options.properties.some(
      property =>
        ts.isPropertyAssignment(property) &&
        property.name.getText(source.sourceFile) === 'preload' &&
        property.initializer.kind === ts.SyntaxKind.FalseKeyword
    );
  }

  private static scanCalls(
    source: TsxSource,
    bindings: Bindings,
    evidence: ReactPerformanceEvidence,
    at: (line: number, what: string) => string
  ): void {
    const ts = source.ts;
    const lists: Record<CallMeaning['kind'], string[]> = {
      lazy: evidence.dynamicImports,
      vitals: evidence.webVitalsReports,
      hint: evidence.resourceHints,
    };
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const meaning = this.callMeaning(source, node, bindings);
      if (meaning) lists[meaning.kind].push(at(source.lineOf(node), meaning.label));
    });
  }

  private static scanJsx(
    source: TsxSource,
    bindings: Bindings,
    evidence: ReactPerformanceEvidence,
    at: (line: number, what: string) => string
  ): void {
    for (const element of source.jsxElements()) {
      if (bindings.nextImage && element.tag === bindings.nextImage) {
        this.nextImage(element, evidence, at);
      } else if (element.tag === 'img' && stringAttribute(element, 'loading') === 'lazy') {
        evidence.lazyImages.push(at(element.line, '<img loading="lazy">'));
      } else if (element.tag === 'link') {
        const rel = stringAttribute(element, 'rel');
        if (rel && LINK_HINTS.has(rel)) evidence.resourceHints.push(at(element.line, `<link rel="${rel}">`));
      }
    }
  }

  private static nextImage(
    element: JsxElementInfo,
    evidence: ReactPerformanceEvidence,
    at: (line: number, what: string) => string
  ): void {
    if (!isTrueAttribute(element, 'unoptimized')) {
      evidence.optimizedImages.push(at(element.line, '<Image>'));
    }
    const eager =
      isTrueAttribute(element, 'priority') ||
      isTrueAttribute(element, 'preload') ||
      stringAttribute(element, 'loading') === 'eager';
    if (!eager) evidence.lazyImages.push(at(element.line, 'lazy <Image>'));
  }
}
