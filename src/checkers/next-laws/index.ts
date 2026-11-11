/**
 * Next.js Laws — what the App Router and Pages Router make of a React app:
 * route files, the 'use client' boundary, metadata, images, scripts, links
 * and the build's own measurements. Selected only where a workspace
 * package declares `next`.
 */

export { HtmlLangDeclaredLaw } from './html-lang-declared';
export { NextHeavyLibInClientGraphLaw } from './next-heavy-lib-in-client-graph';
export { NextImageHasDimensionsLaw } from './next-image-has-dimensions';
export { NextMetadataDeclaredLaw } from './next-metadata-declared';
export { NextThirdPartyScriptDeclaredLaw } from './next-third-party-script-declared';
