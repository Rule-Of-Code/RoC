/**
 * Next.js Server Laws Data Module
 *
 * What a Next app exposes and ships that no test of a component sees: Server
 * Actions and route handlers are public endpoints, a 'use client' import pulls
 * a module graph into the browser, the proxy and the error boundaries are
 * found by file name and position, and NEXT_PUBLIC_* is fixed at build time.
 * Every Next behaviour a law relies on was read in next@16.4.6 itself (its
 * dist/ and the docs it ships in dist/docs/). Each law is gated by `requires`
 * on `next` (Client IP Single Boundary: any common Node HTTP server), and
 * reports what it could not read as a violation. legacyId range: 531–549.
 */

import type { EnhancedConstitutionalLaw, LawRequirement } from '../types/enhanced-law.types';
import { REQUIRES_NEXT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

/** The App Router laws: `next` declared, and an app/ or src/app/ directory present. */
const REQUIRES_NEXT_APP_ROUTER: LawRequirement = {
  anyDependency: ['next'],
  anyFile: ['app', 'src/app'],
};

const PARSER_LIMIT =
  "Parses with the project's own TypeScript (ts.createSourceFile, no type checker); without it every file is reported unread, never passed.";
const GRAPH_LIMIT =
  "The client graph follows static imports, `export … from`, and literal `import()`/`require()` through the project's own TypeScript resolver (tsconfig paths, workspace packages); a computed `import()` path is not followed, and an import that does not resolve is reported, not passed.";
const ROUTER_LIMIT =
  "Reads the router directory Next uses (app/ before src/app/) with Next's default page extensions (tsx, ts, jsx, js); a custom `pageExtensions` in next.config is not read.";

export const NEXT_SERVER_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Next Server Action Authorizes',
      'Every Server Action calls a configured authorization guard before its first statement',
      'next'
    ),
    legacyId: 531,
    article: 'XXIII',
    subsection: '23.1',
    title: 'Next Server Action Authorizes',
    rationale:
      'Next makes every exported function of a \'use server\' module "reachable via a direct POST request, not just through your application\'s UI", and "a page-level authentication check does not extend to the Server Actions defined within it" (next/dist/docs/01-app/02-guides/data-security.md). The arguments are whatever the caller sends. An action without its own guard looks like any other function, and every test that calls it as the UI does passes.',
    satisfiedBy: {
      react:
        "Make a guard the first statement of every action — `'use server'; export async function deletePost(id: string) { const user = await requireUser(); … }` — and list it in `thresholds.next.authGuards: [\"requireUser\"]`. A wrapper (`export const deletePost = withAuth(async (id) => …)`) listed there counts too.",
    },
    detectionLimits: [
      'Presence only: it proves a configured guard is called first, not that the guard checks the right permission for this resource (the IDOR case).',
      'A guard called inside a helper that is not listed in thresholds.next.authGuards is not seen; list the helper, or call the guard in the action.',
      "An action re-exported from another module (`export { x } from './y'`) cannot be read here and is reported.",
      'An exported value that is neither a function nor a call (`export default importedAction`) is not judged.',
      PARSER_LIMIT,
    ],
    emoji: '🛂',
    description: 'Every Server Action calls a configured authorization guard before its first statement',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NextServerActionAuthorizesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.1: a Server Action does not authorize its caller first',
    remediation:
      'Call a guard from thresholds.next.authGuards as the first statement of every Server Action',
  },

  {
    id: generateLawId(
      'Next Route Handler Guarded',
      'Every mutating route handler calls a configured guard or is declared public, and validates the body it reads',
      'next'
    ),
    legacyId: 532,
    article: 'XXIII',
    subsection: '23.2',
    title: 'Next Route Handler Guarded',
    rationale:
      'A route.ts that exports POST, PUT, PATCH or DELETE is a mutating HTTP endpoint (next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md). One with no guard compiles, looks like its neighbours and passes every test written by the person who meant to call it. A body read with request.json() is whatever the client sent; typed as the author hoped, it is not checked by the compiler at runtime.',
    satisfiedBy: {
      react:
        'In each mutating handler call a guard listed in `thresholds.next.authGuards` (or export `withAuth(handler)`), and validate the body with a call listed in `thresholds.next.bodyValidators` (`const input = Schema.parse(await request.json())`). Declare a deliberately public handler in `thresholds.next.publicRoutes: [{ "route": "/api/webhooks/stripe", "reason": "signed webhook" }]`.',
    },
    detectionLimits: [
      'Presence only: a guard anywhere in the handler counts; whether it fits the route, and whether it runs on every branch, is not judged.',
      'GET, HEAD and OPTIONS handlers are not judged, including a GET with side effects.',
      'Body validation is recognised by name (thresholds.next.bodyValidators) or any typeof in the handler; its quality is not judged. Reads other than json()/formData() on the first parameter (text(), arrayBuffer(), a body passed to a helper) are not seen.',
      'Pages Router API routes (pages/api/**) are not read.',
      "A handler re-exported from another module cannot be read and fails unless its route is in thresholds.next.publicRoutes.",
      ROUTER_LIMIT,
      PARSER_LIMIT,
    ],
    emoji: '🚧',
    description:
      'Every mutating route handler calls a configured guard or is declared public, and validates the body it reads',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NextRouteHandlerGuardedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.2: a mutating route handler is unguarded or reads an unvalidated body',
    remediation:
      'Call a configured guard in each POST/PUT/PATCH/DELETE handler (or declare it public with a reason) and validate the body',
  },

  {
    id: generateLawId(
      'Next Server Only Boundary',
      'No server module reaches a client graph, and modules importing one carry server-only',
      'next'
    ),
    legacyId: 533,
    article: 'XXIII',
    subsection: '23.3',
    title: 'Next Server Only Boundary',
    rationale:
      "A 'use client' file brings every module it imports, transitively, into the browser bundle; \"it's possible to accidentally import server-only code into the client\" (next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md). `import 'server-only'` turns that into a build error — next/dist/build/webpack-config.js reports \"'server-only' cannot be imported from a Client Component module\" — but only in a module that carries the marker, and nothing requires it.",
    satisfiedBy: {
      react:
        "Keep database drivers and Node built-ins out of every module a 'use client' file imports; put `import 'server-only'` at the top of each module that imports one (the data access layer). Extend the built-in list with `thresholds.next.serverModules`.",
    },
    detectionLimits: [
      GRAPH_LIMIT,
      'Server data handed to a client component as props is not seen; that is a data question, not an import.',
      "The second rule (import 'server-only') can be turned off with thresholds.next.requireServerOnlyMarker: false. The npm server-only package throws outside the react-server condition, so a module that plain Node scripts or a Jest/Vitest run import needs it mocked there.",
      "Pages Router pages are not client entries here (Next strips imports used only by getServerSideProps); the client graph is the App Router's 'use client' graph plus instrumentation-client.",
      'Built-in list: Node built-ins Next does not polyfill for the browser, and common database drivers/ORMs; a server module not on it is not seen unless added in thresholds.next.serverModules.',
      PARSER_LIMIT,
    ],
    emoji: '🧱',
    description: 'No server module reaches a client graph, and modules importing one carry server-only',
    priority: 'HIGH',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NextServerOnlyBoundaryLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.3: server code reaches the browser bundle, or lacks the server-only marker',
    remediation:
      "Remove server imports from the client graph and add import 'server-only' to modules that import a server module",
  },

  {
    id: generateLawId(
      'Next Client Env Public Only',
      'Code bundled for the browser reads only NEXT_PUBLIC_ environment variables',
      'next'
    ),
    legacyId: 534,
    article: 'XXIII',
    subsection: '23.4',
    title: 'Next Client Env Public Only',
    rationale:
      'In code bundled for the browser, "only environment variables prefixed with NEXT_PUBLIC_ are included in the client bundle. If variables are not prefixed, Next.js replaces them with an empty string" (next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md). The client code runs with a blank value and raises nothing: the flag is off, the URL is empty, and server-side tests never see it.',
    satisfiedBy: {
      react:
        'Read server-only variables in a Server Component, route handler or action and pass the value down as a prop; name a variable NEXT_PUBLIC_ only when every visitor may see it.',
    },
    detectionLimits: [
      GRAPH_LIMIT,
      "Sees process.env.X and process.env['X']; an env read through a helper that takes the name as an argument is not seen. Computed access is Next Public Env Is Build Time's rule.",
      "NODE_ENV and the keys of a literal `env` object in next.config are accepted, because Next inlines those; a next.config `env` that is not a literal is not read and is named in the message.",
      PARSER_LIMIT,
    ],
    emoji: '🫥',
    description: 'Code bundled for the browser reads only NEXT_PUBLIC_ environment variables',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NextClientEnvPublicOnlyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.4: browser code reads a non-public environment variable',
    remediation:
      'Read the variable on the server and pass it down, or rename it NEXT_PUBLIC_ if it is public',
  },

  {
    id: generateLawId(
      'Next Proxy Placement And Matcher',
      'The Next proxy sits where Next loads it, is not duplicated by middleware, exports one function and a literal matcher',
      'next'
    ),
    legacyId: 535,
    article: 'XXIII',
    subsection: '23.5',
    title: 'Next Proxy Placement And Matcher',
    rationale:
      'Next looks for proxy (middleware before v16) only in the parent of the router directory, so proxy.ts at the root beside src/app/ is never loaded and nothing says so (next/dist/build/index.js). Without a matcher it "runs on every request, including static files", and a non-constant matcher "will be ignored" (next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md). middleware is deprecated in v16, and both files together stop the build.',
    satisfiedBy: {
      react:
        "Put proxy.ts beside app/ (in src/ when the router is in src/), export one function (`export function proxy(request)` or a default), and `export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }`. A proxy meant to run everywhere declares why in `thresholds.next.proxyWithoutMatcher`.",
    },
    detectionLimits: [
      'Does not judge whether the matcher covers the right paths, nor Server Functions reachable on excluded paths (Next Server Action Authorizes covers those).',
      'The Next major is read from the installed next (else the declared range); on Next 15 and older middleware is the expected name.',
      ROUTER_LIMIT,
      PARSER_LIMIT,
    ],
    emoji: '🚦',
    description:
      'The Next proxy sits where Next loads it, is not duplicated by middleware, exports one function and a literal matcher',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextProxyPlacementAndMatcherLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.5: the Next proxy is misplaced, duplicated, or has no literal matcher',
    remediation:
      'Place proxy.ts beside the router directory, drop middleware.ts, export one function and a literal config.matcher',
  },

  {
    id: generateLawId(
      'Next Error Boundaries Declared',
      'The root App Router directory declares not-found, error and global-error, as Next requires them',
      'next'
    ),
    legacyId: 536,
    article: 'XXIII',
    subsection: '23.6',
    title: 'Next Error Boundaries Declared',
    rationale:
      'error.js "does not wrap the layout.js or template.js above it in the same segment. To handle errors in the root layout, use global-error.js", which "must define its own <html> and <body> tags"; error boundaries "must be Client Components" (next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md). Absent files fall back to the framework default and nothing fails.',
    satisfiedBy: {
      react:
        "Add app/not-found.tsx, app/error.tsx and app/global-error.tsx; open error.tsx and global-error.tsx with 'use client'; render `<html><body>…</body></html>` in global-error.tsx.",
    },
    detectionLimits: [
      'Root segment only: nested segments that need their own error.tsx are not judged, nor the quality of the UI.',
      'Selected where an app/ or src/app/ directory exists in a workspace package; a Next app with only a Pages Router is not selected.',
      ROUTER_LIMIT,
      PARSER_LIMIT,
    ],
    emoji: '🧯',
    description: 'The root App Router directory declares not-found, error and global-error, as Next requires them',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_NEXT_APP_ROUTER,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NextErrorBoundariesDeclaredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.6: the root App Router lacks a declared error boundary',
    remediation:
      "Add app/not-found, app/error and app/global-error ('use client'; global-error renders <html> and <body>)",
  },
];
