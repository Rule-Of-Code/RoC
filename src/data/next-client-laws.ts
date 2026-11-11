/**
 * Next.js Client Laws Data Module
 *
 * What a Next app ships to the browser and how it gets there: the
 * `'use client'` boundary and the import graph below it, the props that
 * cross it, images, scripts and links in JSX, metadata and `<html lang>`,
 * the App Router's segment files, and — after a build — the bytes each route
 * loads. Each law is gated by `requires` on `next`, so it is not selected
 * where no workspace package declares it. Every law reads TSX with the
 * project's own TypeScript; a file it could not read is a violation, never a
 * pass. legacyId range: 551–569.
 *
 * Next behaviour cited here was checked against an installed next@16.4.6
 * (its bundled docs under next/dist/docs and its compiled source).
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_NEXT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

/** Shared limits. */
const PAGE_EXTENSIONS =
  'Route files are recognised by Next\'s default pageExtensions (tsx, ts, jsx, js); a custom `pageExtensions` in next.config is not read.';
const UNREAD_FAILS =
  "Uses the project's own `typescript` to parse; without it, or for a file it cannot open, the law reports what it did not read instead of passing.";
const GRAPH_RESOLUTION =
  'The import graph is static: specifiers are resolved with the nearest tsconfig.json (relative paths, index files, `paths` aliases) under bundler resolution. Webpack/Turbopack `resolve.alias` in next.config is not read; an alias that only exists there is reported as unresolved. Packages are not walked into, and `require()` calls are not edges.';

export const NEXT_CLIENT_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Next Metadata Declared',
      'Every Next page has a title: metadata or generateMetadata in the page or a layout above it, or a next/head title',
      'next'
    ),
    legacyId: 551,
    article: 'XXIV',
    subsection: '24.1',
    title: 'Next Metadata Declared',
    rationale:
      'A page without a title renders correctly — so no test notices — and is listed as its URL in every tab, bookmark, history entry and search result. In the App Router the title is metadata, and Next merges metadata down the segment tree: a `title` in a layout covers every page below it, so one root-layout title with `title.template` is enough (next/dist/docs: generate-metadata, "Metadata can be added to layout.js and page.js files").',
    satisfiedBy: {
      react:
        "App Router: `export const metadata: Metadata = { title: { default: 'Acme', template: '%s · Acme' } }` in the root layout, and `export const metadata = { title: 'Pricing' }` (or `generateMetadata`) in pages that need their own. Pages Router: `<Head><title>…</title></Head>` from next/head in the page or in _app. A route that needs no title: `thresholds.next.metadataExemptRoutes`.",
    },
    detectionLimits: [
      'A `metadata` object literal must carry `title` (a spread counts as carrying it); a `metadata` that is not a literal, a re-exported one, and any `generateMetadata` are trusted without reading what they return.',
      'Does not judge metadata quality, duplication across pages, or the other fields (description, Open Graph).',
      'Pages Router: looks for a `<title>` element nested in the next/head component in the page or in _app; a title rendered by a shared component that wraps next/head is not seen and the page is flagged.',
      PAGE_EXTENSIONS,
      UNREAD_FAILS,
    ],
    emoji: '🏷️',
    description:
      'Every Next page has a title: metadata or generateMetadata in the page or a layout above it, or a next/head title',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextMetadataDeclaredLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.1: Next page without a title',
    remediation: 'Export metadata with a title from the page or a layout above it (Pages Router: next/head <title>)',
  },

  {
    id: generateLawId(
      'Next Heavy Lib In Client Graph',
      'No module that ships to the browser imports a heavy library statically; it is loaded with next/dynamic or import()',
      'next'
    ),
    legacyId: 552,
    article: 'XXIV',
    subsection: '24.2',
    title: 'Next Heavy Lib In Client Graph',
    rationale:
      "A `'use client'` module and everything it imports statically — transitively — ship in the first-load JavaScript of every route that renders it. One `import moment from 'moment'` in a shared helper reached from a client component puts the whole library into those routes, and nothing at the import site says so. `next/dynamic`, `React.lazy` and `import()` split the library into its own chunk, loaded when it is used (next/dist/docs: lazy-loading).",
    satisfiedBy: {
      react:
        "`const Chart = dynamic(() => import('./chart'))` for the component that needs the library, or `const { default: moment } = await import('moment')` where it is used; import subpaths (`lodash/debounce`) instead of the root; keep the import in a Server Component when the browser does not need it. The list is `thresholds.next.heavyClientLibraries` (globs over the specifier; replaces the default).",
    },
    detectionLimits: [
      'Does not measure bytes: a library is heavy because it is on the list (default: moment, lodash root, chart.js, d3, three, plotly.js, mapbox-gl, monaco-editor, pdfjs-dist — a judgement, not a measurement). An unlisted heavy library passes; see Next Route JS Budget for bytes.',
      "Client entries are the `'use client'` modules plus Pages Router pages and _app. Imports used only by getServerSideProps/getStaticProps/getStaticPaths are not edges (Next strips them from the client bundle); an import used elsewhere in the page counts even if tree-shaking would drop it.",
      GRAPH_RESOLUTION,
      'A package that is itself client code (a UI kit that marks its own modules) is not walked, so what it imports is not seen.',
      UNREAD_FAILS,
    ],
    emoji: '🏋️',
    description:
      'No module that ships to the browser imports a heavy library statically; it is loaded with next/dynamic or import()',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextHeavyLibInClientGraphLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.2: heavy library imported statically into the client bundle',
    remediation: 'Load the library with next/dynamic or import(), or keep it on the server',
  },

  {
    id: generateLawId(
      'Next Image Has Dimensions',
      'Every <img> has width and height; every next/image has them, fill, or a statically imported src',
      'next'
    ),
    legacyId: 553,
    article: 'XXIV',
    subsection: '24.3',
    title: 'Next Image Has Dimensions',
    rationale:
      'An image whose box is unknown until it downloads pushes the content below it down when it arrives: layout shift, the CLS of Core Web Vitals. The browser reserves the box from `width` and `height`. next/image requires both unless the image is statically imported or has `fill` (next/dist/docs: image, "You must set both width and height properties unless…"), and throws `missing required "width" property` (next/dist/shared/lib/get-img-props.js) — but only for an image that actually renders. A plain `<img>` has no such guard.',
    satisfiedBy: {
      react:
        '`<img src="/logo.png" width={120} height={40} alt="…" />`; next/image: `<Image src="/hero.jpg" width={1200} height={630} alt="…" />`, `import hero from "./hero.jpg"; <Image src={hero} alt="…" />`, or `<Image fill sizes="100vw" … />` inside a positioned parent. CSS still sets the rendered size.',
    },
    detectionLimits: [
      'Reads JSX attributes as written: CSS that sets the box (aspect-ratio, fixed height), and images set as CSS backgrounds, are not seen — an <img> sized by CSS is still flagged.',
      'An element with a {...spread} and no width/height is flagged: what the spread sets cannot be read from the file.',
      'next/image is recognised by its default import from next/image or next/legacy/image; another image component (a design-system wrapper) is not read.',
      UNREAD_FAILS,
    ],
    emoji: '🖼️',
    description:
      'Every <img> has width and height; every next/image has them, fill, or a statically imported src',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextImageHasDimensionsLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.3: image without reserved dimensions',
    remediation: 'Give the image width and height (next/image: or fill, or a static import)',
  },

  {
    id: generateLawId(
      'Next Third Party Script Declared',
      'Every external script host is declared with a reason in thresholds.next.thirdPartyScripts',
      'next'
    ),
    legacyId: 554,
    article: 'XXIV',
    subsection: '24.4',
    title: 'Next Third Party Script Declared',
    rationale:
      "A third-party script is added in one line and costs what its vendor decides: its bytes, its main-thread time, the scripts it loads in turn, all from a host that can change them without a deploy. It is the quickest way to break a performance budget, and the line that adds it looks like any other. Declaring each host with its reason makes adding one a reviewed decision.",
    satisfiedBy: {
      react:
        '`"thresholds": { "next": { "thirdPartyScripts": [{ "host": "www.googletagmanager.com", "reason": "analytics required by …" }] } }` (host may be a glob such as `*.example.com`), with the script written as a literal URL, preferably `<Script src="https://…" strategy="lazyOnload" />` from next/script.',
    },
    detectionLimits: [
      'Reads `<script src>` and next/script `<Script src>`: scripts injected at runtime (document.createElement), loaded by another script, or rendered by a wrapper component such as @next/third-parties are not seen.',
      'A src that is not a literal (or a template whose host is not fixed) is reported as unreadable rather than guessed.',
      'Judges hosts, not cost: a declared host passes whatever it serves.',
      UNREAD_FAILS,
    ],
    emoji: '📜',
    description:
      'Every external script host is declared with a reason in thresholds.next.thirdPartyScripts',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextThirdPartyScriptDeclaredLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.4: undeclared third-party script',
    remediation: 'Declare the script host with a reason in thresholds.next.thirdPartyScripts',
  },

  {
    id: generateLawId(
      'HTML Lang Declared',
      'The root layout <html> (or pages/_document <Html>) of a Next app declares a non-empty lang',
      'next'
    ),
    legacyId: 555,
    article: 'XXIV',
    subsection: '24.5',
    title: 'HTML Lang Declared',
    rationale:
      'Without `lang` on `<html>` a screen reader guesses the language of every page and reads it with the wrong pronunciation rules, and the browser offers to translate a page already in the reader\'s language (WCAG 2.x SC 3.1.1 Language of Page). In a Next app it is one attribute in one file: the root layout\'s `<html>`, or `pages/_document`\'s `<Html>`, which Next fills from the i18n locale when i18n is configured (next/dist/pages/_document.js: `lang: props.lang || locale`).',
    satisfiedBy: {
      react:
        'App Router: `<html lang="en">` in the root layout (`lang={locale}` under a `[locale]` segment). Pages Router: `<Html lang="en">` in pages/_document, or `i18n` in next.config.',
    },
    detectionLimits: [
      'Does not know whether the language is the right one, nor per-section `lang` on inner elements.',
      'A `lang={expression}` is accepted without evaluating it; a `<html>` with a {...spread} and no lang is flagged.',
      'A root layout that renders `<html>` through another component is not followed and is reported as not found. Plain index.html documents (Vite, CRA) are out of scope: the law is selected by `next`.',
      'Pages Router: `i18n` is detected as a key anywhere in next.config.*; its value is not read.',
      UNREAD_FAILS,
    ],
    emoji: '🗣️',
    description:
      'The root layout <html> (or pages/_document <Html>) of a Next app declares a non-empty lang',
    priority: 'MEDIUM',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'HtmlLangDeclaredLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.5: <html> without lang',
    remediation: 'Set lang on the root layout <html> (Pages Router: _document <Html>)',
  },

  {
    id: generateLawId(
      'Next Internal Link Component',
      'Links to pages of the same Next app use next/link, not a plain <a href="/…">',
      'next'
    ),
    legacyId: 556,
    article: 'XXIV',
    subsection: '24.6',
    title: 'Next Internal Link Component',
    rationale:
      "A plain `<a href=\"/pricing\">` to a page of the same app is a full document load: the browser discards the JavaScript heap, every client state and the router cache, then downloads and hydrates the app again. `next/link` navigates on the client and prefetches the target (next/dist/docs: linking-and-navigating). Sometimes a full load is the point — a recovery page that must reset client state — so the law takes a reason, not a ban.",
    satisfiedBy: {
      react:
        '`<Link href="/pricing">Pricing</Link>` from next/link. A link that must reload: `{/* roc-allow-full-reload: resets the client cache after sign-out */}` on the line before it, or `thresholds.next.fullReloadLinks: [{ "path": "/logout", "reason": "…" }]`.',
    },
    detectionLimits: [
      'Reads literal hrefs only; a computed href (`href={url}`) is not judged.',
      'Flags only hrefs that match a page route of the app (dynamic, catch-all and optional catch-all segments included); a root-relative link to a route handler, a static file, a rewrite or another app on the same domain is not a page here and passes.',
      'A link with `download` or a `target` other than `_self` is not flagged (it is not a navigation of this tab).',
      PAGE_EXTENSIONS,
      UNREAD_FAILS,
    ],
    emoji: '🔗',
    description:
      'Links to pages of the same Next app use next/link, not a plain <a href="/…">',
    priority: 'LOW',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'NextInternalLinkComponentLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article XXIV.24.6: internal link without next/link',
    remediation: 'Use <Link> from next/link for links to pages of the app',
  },
];
