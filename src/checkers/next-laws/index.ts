/**
 * Next.js Laws — the server side of a Next app: Server Actions, route
 * handlers, the proxy, error boundaries, what reaches the browser bundle, and
 * the environment Next inlines at build. Selected only where a workspace
 * package declares `next` (Client IP Single Boundary: any Node HTTP server).
 */

export { NextServerActionAuthorizesLaw } from './next-server-action-authorizes';
export { NextRouteHandlerGuardedLaw } from './next-route-handler-guarded';
export { NextServerOnlyBoundaryLaw } from './next-server-only-boundary';
export { NextClientEnvPublicOnlyLaw } from './next-client-env-public-only';
export { NextProxyPlacementAndMatcherLaw } from './next-proxy-placement-and-matcher';
export { NextErrorBoundariesDeclaredLaw } from './next-error-boundaries-declared';
