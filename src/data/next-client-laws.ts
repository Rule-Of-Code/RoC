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
];
