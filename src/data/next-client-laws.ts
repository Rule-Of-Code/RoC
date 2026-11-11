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
];
