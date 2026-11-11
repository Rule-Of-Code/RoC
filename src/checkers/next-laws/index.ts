/**
 * Next.js Laws — what the App Router and Pages Router make of a React app.
 * The server side: Server Actions, route handlers, the proxy, error
 * boundaries, what reaches the browser bundle, the environment Next inlines
 * at build. The client side: route files, the 'use client' boundary,
 * metadata, images, scripts, links and the build's own measurements.
 * Selected only where a workspace package declares `next` (Client IP Single
 * Boundary: any Node HTTP server).
 */

export { ClientIpSingleBoundaryLaw } from './client-ip-single-boundary';
export { GuardExemptionMatchesARouteLaw } from './guard-exemption-matches-a-route';
export { HtmlLangDeclaredLaw } from './html-lang-declared';
export { NextClientEnvPublicOnlyLaw } from './next-client-env-public-only';
export { NextClientPropsSerializableLaw } from './next-client-props-serializable';
export { NextErrorBoundariesDeclaredLaw } from './next-error-boundaries-declared';
export { NextHeavyLibInClientGraphLaw } from './next-heavy-lib-in-client-graph';
export { NextImageHasDimensionsLaw } from './next-image-has-dimensions';
export { NextInternalLinkComponentLaw } from './next-internal-link-component';
export { NextLoadingForAsyncPageLaw } from './next-loading-for-async-page';
export { NextMetadataDeclaredLaw } from './next-metadata-declared';
export { NextProxyPlacementAndMatcherLaw } from './next-proxy-placement-and-matcher';
export { NextPublicEnvIsBuildTimeLaw } from './next-public-env-is-build-time';
export { NextRouteHandlerGuardedLaw } from './next-route-handler-guarded';
export { NextRouteJsBudgetLaw } from './next-route-js-budget';
export { NextSegmentConfigConsistentLaw } from './next-segment-config-consistent';
export { NextServerActionAuthorizesLaw } from './next-server-action-authorizes';
export { NextServerOnlyBoundaryLaw } from './next-server-only-boundary';
export { NextThirdPartyScriptDeclaredLaw } from './next-third-party-script-declared';
export { NextUseClientAtLeavesLaw } from './next-use-client-at-leaves';
