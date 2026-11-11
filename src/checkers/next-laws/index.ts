/**
 * Next.js Laws — what the App Router and Pages Router make of a React app:
 * route files, the 'use client' boundary, metadata, images, scripts, links
 * and the build's own measurements. Selected only where a workspace
 * package declares `next`.
 */

export { HtmlLangDeclaredLaw } from './html-lang-declared';
export { NextClientPropsSerializableLaw } from './next-client-props-serializable';
export { NextHeavyLibInClientGraphLaw } from './next-heavy-lib-in-client-graph';
export { NextImageHasDimensionsLaw } from './next-image-has-dimensions';
export { NextInternalLinkComponentLaw } from './next-internal-link-component';
export { NextLoadingForAsyncPageLaw } from './next-loading-for-async-page';
export { NextMetadataDeclaredLaw } from './next-metadata-declared';
export { NextRouteJsBudgetLaw } from './next-route-js-budget';
export { NextSegmentConfigConsistentLaw } from './next-segment-config-consistent';
export { NextThirdPartyScriptDeclaredLaw } from './next-third-party-script-declared';
export { NextUseClientAtLeavesLaw } from './next-use-client-at-leaves';
