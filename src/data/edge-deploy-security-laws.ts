/**
 * Edge Proxy and Deploy-Security Laws Data Module
 *
 * What a proxy forwards, which public addresses a deploy creates, where a
 * hosting rewrite sends traffic, which project a test build writes into, and
 * what a script writes to disk. None of it shows in a unit test: each is a
 * property of the configuration or of one line that builds a URL. Each law
 * is selected only where its subject is in the files git publishes, reports
 * every finding file and line, and says it judged nothing when it could not
 * read its subject. legacyId range: 895–899.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_PROXY_UPSTREAM_URL } from '../utils/edge-deploy/requirements';
import { generateLawId } from '../utils/id-generator';

const GATE_READ =
  'Inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file never selects it; outside git the disk is walked, up to eight directories deep, outside installed, built and virtualenv trees. Test and fixture trees are excluded. The law reads exactly the files that selected it; ignores.global leaves the same files out of both.';

export const EDGE_DEPLOY_SECURITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Proxy Target Keeps Origin Host',
      'A proxy builds its upstream URL from the origin and copies only the path and query, never resolving the incoming path against the origin',
      'security'
    ),
    legacyId: 895,
    article: 'XXIII',
    subsection: '23.10',
    title: 'Proxy Target Keeps Origin Host',
    rationale:
      'A reverse proxy that forwards with new URL(incomingPath, ORIGIN) sends the request to whatever host the path names when it starts with // (or /\\): the URL standard reads a scheme-relative reference as a new host. The proxy then attaches what it adds for the origin — a shared origin-verification secret — and hands it to that host. Every test that sends a normal path passes; the escape needs one request with a doubled slash.',
    satisfiedBy: {
      typescript:
        'const target = new URL(ORIGIN); target.pathname = incoming.pathname; target.search = incoming.search; — and reject an incoming path that does not start with exactly one "/".',
      python:
        'Build the URL from the origin and the path: f"{ORIGIN}/{path.lstrip(\'/\')}" after rejecting a path that starts with "//", or httpx.URL(ORIGIN).copy_with(path=…, query=…); never urljoin(ORIGIN, request_path).',
    },
    detectionLimits: [
      "JS/TS: every new URL(a, b) with a base is judged, parsed with the project's own TypeScript (without it the JS/TS files are listed as not judged). A literal first argument is safe. A finding needs both: the first argument comes from the incoming request — a parameter named req/request/incoming/event/c/ctx/context or typed Request/NextRequest/IncomingMessage/FastifyRequest/FetchEvent/Context, or the first parameter of a fetch handler or of a callback given to serve(…) / addEventListener('fetch', …), followed through local variables and destructuring in the same file — and the URL reaches fetch, new Request, axios, got, ky, undici or http(s).request/get, as an argument (through .href, .toString() or a template) or through a local variable passed to one later in the same function.",
      'Not followed: a URL built in a helper and returned to its caller, a value passed between files, class fields. A guard that rejects // paths before the call is not recognised — the finding stays until the URL is built from the origin.',
      'Python (read as text): urljoin(base, url) whose url names request/req, a parameter of a route handler (a function with a request parameter or an @x.get(…)-style decorator) or a local assigned from one, and that is passed to requests/httpx/aiohttp/urllib3, a *client/*session object or urlopen in the same function.',
      'Proxies configured rather than coded (http-proxy and its target option, platform rewrites, nginx) are not read.',
      `Selected only where a .ts/.mts/.cts/.js/.mjs/.cjs file (.d.ts, spec/test/stories and minified files excluded) holds a new URL( with a non-literal first argument and a base and an HTTP call, or a .py file (test_*.py, *_test.py, conftest.py excluded) calls urljoin(. ${GATE_READ} A pass names the URLs judged and the files read (also in the result's metrics).`,
    ],
    emoji: '🧭',
    description:
      'A proxy builds its upstream URL from the origin and copies only the path and query, never resolving the incoming path against the origin',
    priority: 'HIGH',
    category: 'SECURITY',
    requires: REQUIRES_PROXY_UPSTREAM_URL,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ProxyTargetKeepsOriginHostLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXIII.23.10: A proxy resolves the incoming path against its origin — a // path sends the request to another host',
    remediation:
      'Start from the origin URL and assign only pathname and search from the incoming request; reject paths that do not start with exactly one "/"',
  },
];
