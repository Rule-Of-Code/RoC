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

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_NEXT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

const PARSER_LIMIT =
  "Parses with the project's own TypeScript (ts.createSourceFile, no type checker); without it every file is reported unread, never passed.";

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
];
